import { describe, it, expect, vi, beforeEach } from 'vitest';
import { seederRunner } from '../../seeders/seeder-runner';
import { SeederModel } from '../../seeders/seeder.model';

vi.mock('fs/promises', () => ({
  default: {
    readdir: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../../seeders/seeder.model', () => ({
  SeederModel: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      }),
    }),
    findOneAndUpdate: vi.fn(),
    deleteMany: vi.fn(),
  },
}));

vi.mock('../../config/env', () => ({
  env: {
    NODE_ENV: 'test',
    SEED_ALLOWED_ENVS: ['development', 'test', 'staging'],
  },
}));

describe('seederRunner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('status', () => {
    it('should return empty status when no seeders are present', async () => {
      const status = await seederRunner.status({ environment: 'test' });
      expect(status).toEqual([]);
    });
  });

  describe('run', () => {
    it('should reject seeding in disallowed environments', async () => {
      await expect(seederRunner.run({ environment: 'production' })).rejects.toThrow(
        "Seeding is not allowed in environment 'production'"
      );
    });

    it('should return empty array when no seeders are found', async () => {
      const result = await seederRunner.run({ environment: 'test' });
      expect(result).toEqual([]);
    });
  });

  describe('reset', () => {
    it('should reject reset in disallowed environments', async () => {
      await expect(seederRunner.reset({ environment: 'production' })).rejects.toThrow(
        "Cannot reset seeders in environment 'production'"
      );
    });
  });
});
