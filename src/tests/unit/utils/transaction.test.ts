import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withTransaction, isTransactionSupported } from '../../../utils/transaction';

const mockSession = {
  withTransaction: vi.fn(),
  endSession: vi.fn(),
};

vi.mock('mongoose', () => ({
  default: {
    connection: {
      startSession: vi.fn(),
      client: {
        topology: {
          description: { type: 'ReplicaSet' },
        },
      },
    },
  },
  connection: {
    startSession: vi.fn(),
    client: {
      topology: {
        description: { type: 'ReplicaSet' },
      },
    },
  },
}));

import mongoose from 'mongoose';

const getMockConnection = () =>
  mongoose.connection as unknown as {
    startSession: ReturnType<typeof vi.fn>;
    client: { topology: { description: { type: string } } };
  };

describe('transaction utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMockConnection().client.topology.description.type = 'ReplicaSet';
  });

  describe('isTransactionSupported', () => {
    it('should return true for replica set', async () => {
      const result = await isTransactionSupported();
      expect(result).toBe(true);
    });

    it('should return false for standalone', async () => {
      getMockConnection().client.topology.description.type = 'Standalone';
      const result = await isTransactionSupported();
      expect(result).toBe(false);
    });
  });

  describe('withTransaction', () => {
    it('should execute operation inside transaction when supported', async () => {
      getMockConnection().startSession.mockResolvedValue(mockSession);
      mockSession.withTransaction.mockImplementation(
        async (fn: (s: unknown) => Promise<unknown>) => {
          return fn({});
        }
      );

      const operation = vi.fn().mockResolvedValue('done');
      const result = await withTransaction(operation);

      expect(result).toBe('done');
      expect(getMockConnection().startSession).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
    });

    it('should run without session on transaction errors', async () => {
      getMockConnection().startSession.mockRejectedValue(
        new Error('transactions are not supported')
      );

      const operation = vi.fn().mockResolvedValue('fallback');
      const result = await withTransaction(operation);

      expect(result).toBe('fallback');
      expect(operation).toHaveBeenCalledWith({ session: null });
    });

    it('should support dry-run mode', async () => {
      const operation = vi.fn().mockResolvedValue('dry');
      const result = await withTransaction(operation, { dryRun: true });

      expect(result).toBe('dry');
      expect(getMockConnection().startSession).not.toHaveBeenCalled();
      expect(operation).toHaveBeenCalledWith({ session: null });
    });
  });
});
