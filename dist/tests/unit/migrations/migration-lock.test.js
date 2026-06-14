"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const migration_lock_1 = require("../../../migrations/migration-lock");
const migration_lock_model_1 = require("../../../migrations/migration-lock.model");
vitest_1.vi.mock('../../../migrations/migration-lock.model', () => ({
    MigrationLockModel: {
        findOneAndUpdate: vitest_1.vi.fn(),
        findOneAndDelete: vitest_1.vi.fn(),
    },
    getMigrationLockId: () => 'migrations',
}));
(0, vitest_1.describe)('migrationLock', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.it)('should acquire lock when none exists', async () => {
        vitest_1.vi.mocked(migration_lock_model_1.MigrationLockModel.findOneAndUpdate).mockResolvedValue({
            value: { owner: (0, migration_lock_1.getLockOwner)() },
        });
        const acquired = await migration_lock_1.migrationLock.acquire();
        (0, vitest_1.expect)(acquired).toBe(true);
    });
    (0, vitest_1.it)('should not acquire lock held by another process', async () => {
        vitest_1.vi.mocked(migration_lock_model_1.MigrationLockModel.findOneAndUpdate).mockResolvedValue({
            value: { owner: 'other-host:123' },
        });
        const acquired = await migration_lock_1.migrationLock.acquire();
        (0, vitest_1.expect)(acquired).toBe(false);
    });
    (0, vitest_1.it)('should handle acquisition errors gracefully', async () => {
        vitest_1.vi.mocked(migration_lock_model_1.MigrationLockModel.findOneAndUpdate).mockRejectedValue(new Error('db down'));
        const acquired = await migration_lock_1.migrationLock.acquire();
        (0, vitest_1.expect)(acquired).toBe(false);
    });
    (0, vitest_1.it)('should release lock for current owner', async () => {
        vitest_1.vi.mocked(migration_lock_model_1.MigrationLockModel.findOneAndDelete).mockResolvedValue({ _id: 'migrations' });
        await (0, vitest_1.expect)(migration_lock_1.migrationLock.release()).resolves.toBeUndefined();
    });
});
//# sourceMappingURL=migration-lock.test.js.map