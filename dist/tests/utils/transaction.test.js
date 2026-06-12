"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const transaction_1 = require("../../utils/transaction");
const mockSession = {
    withTransaction: vitest_1.vi.fn(),
    endSession: vitest_1.vi.fn(),
};
vitest_1.vi.mock('mongoose', () => ({
    default: {
        connection: {
            startSession: vitest_1.vi.fn(),
            client: {
                topology: {
                    description: { type: 'ReplicaSet' },
                },
            },
        },
    },
    connection: {
        startSession: vitest_1.vi.fn(),
        client: {
            topology: {
                description: { type: 'ReplicaSet' },
            },
        },
    },
}));
const mongoose_1 = __importDefault(require("mongoose"));
const getMockConnection = () => mongoose_1.default.connection;
(0, vitest_1.describe)('transaction utils', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        getMockConnection().client.topology.description.type = 'ReplicaSet';
    });
    (0, vitest_1.describe)('isTransactionSupported', () => {
        (0, vitest_1.it)('should return true for replica set', async () => {
            const result = await (0, transaction_1.isTransactionSupported)();
            (0, vitest_1.expect)(result).toBe(true);
        });
        (0, vitest_1.it)('should return false for standalone', async () => {
            getMockConnection().client.topology.description.type = 'Standalone';
            const result = await (0, transaction_1.isTransactionSupported)();
            (0, vitest_1.expect)(result).toBe(false);
        });
    });
    (0, vitest_1.describe)('withTransaction', () => {
        (0, vitest_1.it)('should execute operation inside transaction when supported', async () => {
            getMockConnection().startSession.mockResolvedValue(mockSession);
            mockSession.withTransaction.mockImplementation(async (fn) => {
                return fn({});
            });
            const operation = vitest_1.vi.fn().mockResolvedValue('done');
            const result = await (0, transaction_1.withTransaction)(operation);
            (0, vitest_1.expect)(result).toBe('done');
            (0, vitest_1.expect)(getMockConnection().startSession).toHaveBeenCalled();
            (0, vitest_1.expect)(mockSession.endSession).toHaveBeenCalled();
        });
        (0, vitest_1.it)('should run without session on transaction errors', async () => {
            getMockConnection().startSession.mockRejectedValue(new Error('transactions are not supported'));
            const operation = vitest_1.vi.fn().mockResolvedValue('fallback');
            const result = await (0, transaction_1.withTransaction)(operation);
            (0, vitest_1.expect)(result).toBe('fallback');
            (0, vitest_1.expect)(operation).toHaveBeenCalledWith({ session: null });
        });
        (0, vitest_1.it)('should support dry-run mode', async () => {
            const operation = vitest_1.vi.fn().mockResolvedValue('dry');
            const result = await (0, transaction_1.withTransaction)(operation, { dryRun: true });
            (0, vitest_1.expect)(result).toBe('dry');
            (0, vitest_1.expect)(getMockConnection().startSession).not.toHaveBeenCalled();
            (0, vitest_1.expect)(operation).toHaveBeenCalledWith({ session: null });
        });
    });
});
//# sourceMappingURL=transaction.test.js.map