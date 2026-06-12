"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const aggregation_1 = require("../../utils/aggregation");
vitest_1.vi.mock('../../config/logger', () => ({
    logger: {
        warn: vitest_1.vi.fn(),
        error: vitest_1.vi.fn(),
        info: vitest_1.vi.fn(),
        debug: vitest_1.vi.fn(),
    },
}));
const createMockModel = (execResult) => {
    const optionFn = vitest_1.vi.fn().mockReturnThis();
    const sessionFn = vitest_1.vi.fn().mockReturnThis();
    const execFn = vitest_1.vi.fn().mockResolvedValue(execResult);
    return {
        collection: { collectionName: 'test_collection' },
        aggregate: vitest_1.vi.fn(() => ({
            option: optionFn,
            session: sessionFn,
            exec: execFn,
            explain: vitest_1.vi.fn().mockResolvedValue({ executionStats: {} }),
        })),
        _optionFn: optionFn,
        _sessionFn: sessionFn,
        _execFn: execFn,
    };
};
(0, vitest_1.describe)('aggregation utils', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('sanitizePipeline', () => {
        (0, vitest_1.it)('should return the pipeline when no forbidden stages are present', () => {
            const pipeline = [{ $match: { status: 'active' } }, { $group: { _id: '$status' } }];
            (0, vitest_1.expect)((0, aggregation_1.sanitizePipeline)(pipeline)).toBe(pipeline);
        });
        (0, vitest_1.it)('should reject $out stage', () => {
            (0, vitest_1.expect)(() => (0, aggregation_1.sanitizePipeline)([{ $match: {} }, { $out: 'backup' }])).toThrow('Forbidden aggregation stage: $out');
        });
        (0, vitest_1.it)('should reject $merge stage', () => {
            (0, vitest_1.expect)(() => (0, aggregation_1.sanitizePipeline)([{ $match: {} }, { $merge: { into: 'backup' } }])).toThrow('Forbidden aggregation stage: $merge');
        });
    });
    (0, vitest_1.describe)('buildFacetPagination', () => {
        (0, vitest_1.it)('should build a $facet stage with skip/limit and count', () => {
            const stage = (0, aggregation_1.buildFacetPagination)(2, 10);
            (0, vitest_1.expect)(stage).toEqual({
                $facet: {
                    data: [{ $skip: 10 }, { $limit: 10 }],
                    total: [{ $count: 'count' }],
                },
            });
        });
        (0, vitest_1.it)('should not allow negative skip', () => {
            const stage = (0, aggregation_1.buildFacetPagination)(0, 10);
            (0, vitest_1.expect)(stage.$facet.data[0]).toEqual({ $skip: 0 });
        });
    });
    (0, vitest_1.describe)('buildDateGroupStage', () => {
        (0, vitest_1.it)('should build a daily group stage by default', () => {
            const stage = (0, aggregation_1.buildDateGroupStage)({ field: 'createdAt' });
            (0, vitest_1.expect)(stage).toEqual({
                $group: {
                    _id: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } },
                    count: { $sum: 1 },
                },
            });
        });
        (0, vitest_1.it)('should support monthly granularity', () => {
            const stage = (0, aggregation_1.buildDateGroupStage)({ field: 'createdAt', granularity: 'month' });
            (0, vitest_1.expect)(stage.$group._id).toEqual({
                _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            });
        });
    });
    (0, vitest_1.describe)('timedAggregate', () => {
        (0, vitest_1.it)('should execute a pipeline and return typed results', async () => {
            const mockModel = createMockModel([{ _id: 'active', count: 5 }]);
            const result = await (0, aggregation_1.timedAggregate)(mockModel, [
                { $match: {} },
                { $group: { _id: '$status' } },
            ]);
            (0, vitest_1.expect)(result).toEqual([{ _id: 'active', count: 5 }]);
            (0, vitest_1.expect)(mockModel.aggregate).toHaveBeenCalled();
        });
        (0, vitest_1.it)('should apply session when provided', async () => {
            const mockModel = createMockModel([]);
            const session = { id: 'session-1' };
            await (0, aggregation_1.timedAggregate)(mockModel, [{ $match: {} }], { session });
            (0, vitest_1.expect)(mockModel._sessionFn).toHaveBeenCalledWith(session);
        });
        (0, vitest_1.it)('should throw and log on aggregate errors', async () => {
            const mockModel = createMockModel([]);
            mockModel._execFn.mockRejectedValue(new Error('aggregate failed'));
            await (0, vitest_1.expect)((0, aggregation_1.timedAggregate)(mockModel, [{ $match: {} }])).rejects.toThrow('aggregate failed');
        });
    });
    (0, vitest_1.describe)('paginatedAggregate', () => {
        (0, vitest_1.it)('should extract data and total from a facet result', async () => {
            const mockModel = createMockModel([
                {
                    data: [{ _id: 'a' }, { _id: 'b' }],
                    total: [{ count: 42 }],
                },
            ]);
            const result = await (0, aggregation_1.paginatedAggregate)(mockModel, [{ $match: {} }], {
                page: 1,
                limit: 5,
            });
            (0, vitest_1.expect)(result.data).toHaveLength(2);
            (0, vitest_1.expect)(result.total).toBe(42);
        });
        (0, vitest_1.it)('should default total to 0 when missing', async () => {
            const mockModel = createMockModel([{ data: [], total: [] }]);
            const result = await (0, aggregation_1.paginatedAggregate)(mockModel, [{ $match: {} }]);
            (0, vitest_1.expect)(result.total).toBe(0);
        });
    });
});
//# sourceMappingURL=aggregation.test.js.map