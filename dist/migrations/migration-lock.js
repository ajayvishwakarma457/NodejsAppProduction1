"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrationLock = exports.MigrationLockError = exports.getLockOwner = void 0;
const os_1 = __importDefault(require("os"));
const logger_1 = require("../config/logger");
const migration_lock_model_1 = require("./migration-lock.model");
const getLockOwner = () => `${os_1.default.hostname()}:${process.pid}`;
exports.getLockOwner = getLockOwner;
class MigrationLockError extends Error {
    constructor(message) {
        super(message);
        this.name = 'MigrationLockError';
    }
}
exports.MigrationLockError = MigrationLockError;
exports.migrationLock = {
    /**
     * Attempt to acquire the global migration lock.
     * Returns true if this process acquired it, false otherwise.
     */
    async acquire() {
        try {
            const result = (await migration_lock_model_1.MigrationLockModel.findOneAndUpdate({ _id: (0, migration_lock_model_1.getMigrationLockId)() }, { $setOnInsert: { lockedAt: new Date(), owner: (0, exports.getLockOwner)() } }, { upsert: true, new: true, rawResult: true }));
            const doc = result?.value ?? null;
            if (!doc) {
                return false;
            }
            if (doc.owner !== (0, exports.getLockOwner)()) {
                logger_1.logger.warn('Migration lock is held by another process', { owner: doc.owner });
                return false;
            }
            logger_1.logger.debug('Migration lock acquired', { owner: (0, exports.getLockOwner)() });
            return true;
        }
        catch (error) {
            logger_1.logger.error('Failed to acquire migration lock', { error });
            return false;
        }
    },
    /**
     * Release the migration lock if this process owns it.
     */
    async release() {
        try {
            const result = await migration_lock_model_1.MigrationLockModel.findOneAndDelete({
                _id: (0, migration_lock_model_1.getMigrationLockId)(),
                owner: (0, exports.getLockOwner)(),
            });
            if (result) {
                logger_1.logger.debug('Migration lock released', { owner: (0, exports.getLockOwner)() });
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to release migration lock', { error });
        }
    },
};
//# sourceMappingURL=migration-lock.js.map