"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.withSession = exports.withTransaction = exports.isTransactionSupported = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const logger_1 = require("../config/logger");
const isTransactionError = (error) => {
    if (!(error instanceof Error))
        return false;
    const message = error.message.toLowerCase();
    return (message.includes('transaction') ||
        message.includes('replica set') ||
        message.includes('multidocument') ||
        message.includes('sessions are not supported') ||
        message.includes('transaction numbers'));
};
const isTransientError = (error) => {
    if (!(error instanceof Error))
        return false;
    const message = error.message.toLowerCase();
    return (message.includes('transienttransactionerror') ||
        message.includes('writeconflict') ||
        message.includes('locktimeout'));
};
/**
 * Determine whether the current MongoDB topology supports multi-document
 * transactions. Returns true only for replica sets and sharded clusters.
 */
const isTransactionSupported = async () => {
    try {
        const connection = mongoose_1.default.connection;
        const description = connection.client?.topology?.description;
        if (!description)
            return false;
        const type = description.type?.toLowerCase?.() ?? '';
        return type === 'replset' || type === 'sharded' || type.includes('replica') || type.includes('sharded');
    }
    catch (error) {
        logger_1.logger.debug('Could not determine transaction support', { error });
        return false;
    }
};
exports.isTransactionSupported = isTransactionSupported;
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
const withTransaction = async (operation, options = {}) => {
    if (options.dryRun) {
        return operation({ session: null });
    }
    const run = async (attempt) => {
        let session = null;
        try {
            const supported = await (0, exports.isTransactionSupported)();
            if (!supported) {
                logger_1.logger.warn('MongoDB transactions are not supported on this topology (likely standalone). ' +
                    'Running operation without transaction.');
                return operation({ session: null });
            }
            session = await mongoose_1.default.connection.startSession();
            const result = await session.withTransaction(async (txnSession) => {
                return operation({ session: txnSession });
            });
            return result;
        }
        catch (error) {
            if (!session && isTransactionError(error)) {
                logger_1.logger.warn('MongoDB transactions unavailable. Running operation without transaction.');
                return operation({ session: null });
            }
            if (options.retry && attempt === 1 && isTransientError(error)) {
                logger_1.logger.warn('Transient transaction error, retrying once', { error });
                return run(attempt + 1);
            }
            throw error;
        }
        finally {
            if (session) {
                await session.endSession();
            }
        }
    };
    return run(1);
};
exports.withTransaction = withTransaction;
/**
 * Convenience helper that runs an operation with a session but without an
 * explicit transaction. Useful for read-only session pinning or when the caller
 * manages the transaction lifecycle manually.
 */
const withSession = async (operation) => {
    let session = null;
    try {
        session = await mongoose_1.default.connection.startSession();
        return await operation({ session });
    }
    catch (error) {
        if (isTransactionError(error)) {
            logger_1.logger.warn('MongoDB sessions unavailable. Running operation without session.');
            return operation({ session: null });
        }
        throw error;
    }
    finally {
        if (session) {
            await session.endSession();
        }
    }
};
exports.withSession = withSession;
//# sourceMappingURL=transaction.js.map