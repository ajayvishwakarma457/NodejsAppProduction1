import mongoose, { ClientSession } from 'mongoose';
import { logger } from '../config/logger';

export interface TransactionOptions {
  /** If true, do not actually start a transaction; just pass null session. */
  dryRun?: boolean;
  /** If true, retry once if the transaction fails with a transient error. */
  retry?: boolean;
}

export interface TransactionContext {
  session: ClientSession | null;
}

const isTransactionError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes('transaction') ||
    message.includes('replica set') ||
    message.includes('multidocument') ||
    message.includes('sessions are not supported') ||
    message.includes('transaction numbers')
  );
};

const isTransientError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes('transienttransactionerror') ||
    message.includes('writeconflict') ||
    message.includes('locktimeout')
  );
};

/**
 * Determine whether the current MongoDB topology supports multi-document
 * transactions. Returns true only for replica sets and sharded clusters.
 */
export const isTransactionSupported = async (): Promise<boolean> => {
  try {
    const connection = mongoose.connection as unknown as {
      client?: { topology?: { description?: { type?: string } } };
    };
    const description = connection.client?.topology?.description;
    if (!description) return false;

    const type = description.type?.toLowerCase?.() ?? '';
    return type === 'replset' || type === 'sharded' || type.includes('replica') || type.includes('sharded');
  } catch (error) {
    logger.debug('Could not determine transaction support', { error });
    return false;
  }
};

/**
 * Execute an operation inside a MongoDB transaction.
 *
 * If the server is a replica set or sharded cluster, the operation runs in a
 * session with `withTransaction`, giving atomic commit/rollback. If the server
 * is a standalone instance (common in local dev), transactions are unavailable;
 * the operation runs without a session and a warning is logged once.
 *
 * The operation receives a context object containing the session. Repositories
 * can pass the session to Mongoose queries when session support is added.
 */
export const withTransaction = async <T>(
  operation: (context: TransactionContext) => Promise<T>,
  options: TransactionOptions = {}
): Promise<T> => {
  if (options.dryRun) {
    return operation({ session: null });
  }

  const run = async (attempt: number): Promise<T> => {
    let session: ClientSession | null = null;

    try {
      const supported = await isTransactionSupported();

      if (!supported) {
        logger.warn(
          'MongoDB transactions are not supported on this topology (likely standalone). ' +
            'Running operation without transaction.'
        );
        return operation({ session: null });
      }

      session = await mongoose.connection.startSession();
      const result = await session.withTransaction(async (txnSession) => {
        return operation({ session: txnSession });
      });

      return result as T;
    } catch (error) {
      if (!session && isTransactionError(error)) {
        logger.warn(
          'MongoDB transactions unavailable. Running operation without transaction.'
        );
        return operation({ session: null });
      }

      if (options.retry && attempt === 1 && isTransientError(error)) {
        logger.warn('Transient transaction error, retrying once', { error });
        return run(attempt + 1);
      }

      throw error;
    } finally {
      if (session) {
        await session.endSession();
      }
    }
  };

  return run(1);
};

/**
 * Convenience helper that runs an operation with a session but without an
 * explicit transaction. Useful for read-only session pinning or when the caller
 * manages the transaction lifecycle manually.
 */
export const withSession = async <T>(
  operation: (context: TransactionContext) => Promise<T>
): Promise<T> => {
  let session: ClientSession | null = null;

  try {
    session = await mongoose.connection.startSession();
    return await operation({ session });
  } catch (error) {
    if (isTransactionError(error)) {
      logger.warn('MongoDB sessions unavailable. Running operation without session.');
      return operation({ session: null });
    }
    throw error;
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};
