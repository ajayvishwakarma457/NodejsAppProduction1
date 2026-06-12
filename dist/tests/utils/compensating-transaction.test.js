"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const compensating_transaction_1 = require("../../utils/compensating-transaction");
(0, vitest_1.describe)('compensatingTransaction', () => {
    (0, vitest_1.it)('should run all steps successfully', async () => {
        const step1 = {
            name: 'create-user',
            execute: vitest_1.vi.fn().mockResolvedValue({ id: 'user-1' }),
            compensate: vitest_1.vi.fn().mockResolvedValue(undefined),
        };
        const step2 = {
            name: 'send-welcome',
            execute: vitest_1.vi.fn().mockResolvedValue({ sent: true }),
            compensate: vitest_1.vi.fn().mockResolvedValue(undefined),
        };
        const result = await (0, compensating_transaction_1.compensatingTransaction)([step1, step2]);
        (0, vitest_1.expect)(result.success).toBe(true);
        (0, vitest_1.expect)(result.completedSteps).toEqual(['create-user', 'send-welcome']);
        (0, vitest_1.expect)(step1.execute).toHaveBeenCalled();
        (0, vitest_1.expect)(step2.execute).toHaveBeenCalled();
        (0, vitest_1.expect)(step1.compensate).not.toHaveBeenCalled();
        (0, vitest_1.expect)(step2.compensate).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)('should rollback previous steps when a step fails', async () => {
        const step1 = {
            name: 'create-user',
            execute: vitest_1.vi.fn().mockResolvedValue({ id: 'user-1' }),
            compensate: vitest_1.vi.fn().mockResolvedValue(undefined),
        };
        const step2 = {
            name: 'charge-payment',
            execute: vitest_1.vi.fn().mockRejectedValue(new Error('payment failed')),
            compensate: vitest_1.vi.fn().mockResolvedValue(undefined),
        };
        const result = await (0, compensating_transaction_1.compensatingTransaction)([step1, step2]);
        (0, vitest_1.expect)(result.success).toBe(false);
        (0, vitest_1.expect)(result.failedStep).toBe('charge-payment');
        (0, vitest_1.expect)(result.completedSteps).toEqual(['create-user']);
        (0, vitest_1.expect)(step1.compensate).toHaveBeenCalledWith({ id: 'user-1' });
        (0, vitest_1.expect)(step2.compensate).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)('should record compensation errors', async () => {
        const step1 = {
            name: 'create-user',
            execute: vitest_1.vi.fn().mockResolvedValue({ id: 'user-1' }),
            compensate: vitest_1.vi.fn().mockRejectedValue(new Error('cleanup failed')),
        };
        const step2 = {
            name: 'charge-payment',
            execute: vitest_1.vi.fn().mockRejectedValue(new Error('payment failed')),
            compensate: vitest_1.vi.fn().mockResolvedValue(undefined),
        };
        const result = await (0, compensating_transaction_1.compensatingTransaction)([step1, step2]);
        (0, vitest_1.expect)(result.success).toBe(false);
        (0, vitest_1.expect)(result.compensationErrors).toHaveLength(1);
        (0, vitest_1.expect)(result.compensationErrors[0].step).toBe('create-user');
    });
});
//# sourceMappingURL=compensating-transaction.test.js.map