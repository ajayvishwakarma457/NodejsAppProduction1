import { describe, it, expect, vi, beforeEach } from 'vitest';
import { migrationLock, getLockOwner } from '../../../migrations/migration-lock';
import { MigrationLockModel } from '../../../migrations/migration-lock.model';

vi.mock('../../../migrations/migration-lock.model', () => ({
  MigrationLockModel: {
    findOneAndUpdate: vi.fn(),
    findOneAndDelete: vi.fn(),
  },
  getMigrationLockId: () => 'migrations',
}));

describe('migrationLock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should acquire lock when none exists', async () => {
    vi.mocked(MigrationLockModel.findOneAndUpdate).mockResolvedValue({
      value: { owner: getLockOwner() },
    } as any);

    const acquired = await migrationLock.acquire();
    expect(acquired).toBe(true);
  });

  it('should not acquire lock held by another process', async () => {
    vi.mocked(MigrationLockModel.findOneAndUpdate).mockResolvedValue({
      value: { owner: 'other-host:123' },
    } as any);

    const acquired = await migrationLock.acquire();
    expect(acquired).toBe(false);
  });

  it('should handle acquisition errors gracefully', async () => {
    vi.mocked(MigrationLockModel.findOneAndUpdate).mockRejectedValue(new Error('db down'));

    const acquired = await migrationLock.acquire();
    expect(acquired).toBe(false);
  });

  it('should release lock for current owner', async () => {
    vi.mocked(MigrationLockModel.findOneAndDelete).mockResolvedValue({ _id: 'migrations' } as any);

    await expect(migrationLock.release()).resolves.toBeUndefined();
  });
});
