import { describe, it, expect, vi } from 'vitest';
import { compensatingTransaction } from '../../../utils/compensating-transaction';

describe('compensatingTransaction', () => {
  it('should run all steps successfully', async () => {
    const step1 = {
      name: 'create-user',
      execute: vi.fn().mockResolvedValue({ id: 'user-1' }),
      compensate: vi.fn().mockResolvedValue(undefined),
    };

    const step2 = {
      name: 'send-welcome',
      execute: vi.fn().mockResolvedValue({ sent: true }),
      compensate: vi.fn().mockResolvedValue(undefined),
    };

    const result = await compensatingTransaction([step1, step2]);

    expect(result.success).toBe(true);
    expect(result.completedSteps).toEqual(['create-user', 'send-welcome']);
    expect(step1.execute).toHaveBeenCalled();
    expect(step2.execute).toHaveBeenCalled();
    expect(step1.compensate).not.toHaveBeenCalled();
    expect(step2.compensate).not.toHaveBeenCalled();
  });

  it('should rollback previous steps when a step fails', async () => {
    const step1 = {
      name: 'create-user',
      execute: vi.fn().mockResolvedValue({ id: 'user-1' }),
      compensate: vi.fn().mockResolvedValue(undefined),
    };

    const step2 = {
      name: 'charge-payment',
      execute: vi.fn().mockRejectedValue(new Error('payment failed')),
      compensate: vi.fn().mockResolvedValue(undefined),
    };

    const result = await compensatingTransaction([step1, step2]);

    expect(result.success).toBe(false);
    expect(result.failedStep).toBe('charge-payment');
    expect(result.completedSteps).toEqual(['create-user']);
    expect(step1.compensate).toHaveBeenCalledWith({ id: 'user-1' });
    expect(step2.compensate).not.toHaveBeenCalled();
  });

  it('should record compensation errors', async () => {
    const step1 = {
      name: 'create-user',
      execute: vi.fn().mockResolvedValue({ id: 'user-1' }),
      compensate: vi.fn().mockRejectedValue(new Error('cleanup failed')),
    };

    const step2 = {
      name: 'charge-payment',
      execute: vi.fn().mockRejectedValue(new Error('payment failed')),
      compensate: vi.fn().mockResolvedValue(undefined),
    };

    const result = await compensatingTransaction([step1, step2]);

    expect(result.success).toBe(false);
    expect(result.compensationErrors).toHaveLength(1);
    expect(result.compensationErrors[0].step).toBe('create-user');
  });
});
