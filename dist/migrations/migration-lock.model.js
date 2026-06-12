"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMigrationLockId = exports.MigrationLockModel = void 0;
const mongoose_1 = require("mongoose");
const MIGRATION_LOCK_ID = 'migrations';
const LOCK_TTL_SECONDS = 300;
const migrationLockSchema = new mongoose_1.Schema({
    _id: {
        type: String,
        default: MIGRATION_LOCK_ID,
    },
    lockedAt: {
        type: Date,
        required: true,
        default: Date.now,
    },
    owner: {
        type: String,
        required: true,
    },
}, {
    _id: false,
    timestamps: false,
});
// Stale locks are automatically released after LOCK_TTL_SECONDS.
migrationLockSchema.index({ lockedAt: 1 }, { expireAfterSeconds: LOCK_TTL_SECONDS });
exports.MigrationLockModel = (0, mongoose_1.model)('MigrationLock', migrationLockSchema);
const getMigrationLockId = () => MIGRATION_LOCK_ID;
exports.getMigrationLockId = getMigrationLockId;
//# sourceMappingURL=migration-lock.model.js.map