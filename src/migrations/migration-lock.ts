import os from 'os';
import { logger } from '../config/logger';
import { MigrationLockModel, getMigrationLockId } from './migration-lock.model';

export const getLockOwner = (): string => `${os.hostname()}:${process.pid}`;

export class MigrationLockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MigrationLockError';
  }
}

export const migrationLock = {
  /**
   * Attempt to acquire the global migration lock.
   * Returns true if this process acquired it, false otherwise.
   */
  async acquire(): Promise<boolean> {
    try {
      const result = (await MigrationLockModel.findOneAndUpdate(
        { _id: getMigrationLockId() },
        { $setOnInsert: { lockedAt: new Date(), owner: getLockOwner() } },
        { upsert: true, new: true, rawResult: true }
      )) as { value: { owner: string } | null } | null;

      const doc = result?.value ?? null;
      if (!doc) {
        return false;
      }

      if (doc.owner !== getLockOwner()) {
        logger.warn('Migration lock is held by another process', { owner: doc.owner });
        return false;
      }

      logger.debug('Migration lock acquired', { owner: getLockOwner() });
      return true;
    } catch (error) {
      logger.error('Failed to acquire migration lock', { error });
      return false;
    }
  },

  /**
   * Release the migration lock if this process owns it.
   */
  async release(): Promise<void> {
    try {
      const result = await MigrationLockModel.findOneAndDelete({
        _id: getMigrationLockId(),
        owner: getLockOwner(),
      });

      if (result) {
        logger.debug('Migration lock released', { owner: getLockOwner() });
      }
    } catch (error) {
      logger.error('Failed to release migration lock', { error });
    }
  },
};
