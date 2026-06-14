import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  sanitizePipeline,
  buildFacetPagination,
  buildDateGroupStage,
  timedAggregate,
  paginatedAggregate,
} from '../../../utils/aggregation';

vi.mock('../../../config/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

const createMockModel = (execResult: unknown) => {
  const optionFn = vi.fn().mockReturnThis();
  const sessionFn = vi.fn().mockReturnThis();
  const execFn = vi.fn().mockResolvedValue(execResult);

  return {
    collection: { collectionName: 'test_collection' },
    aggregate: vi.fn(() => ({
      option: optionFn,
      session: sessionFn,
      exec: execFn,
      explain: vi.fn().mockResolvedValue({ executionStats: {} }),
    })),
    _optionFn: optionFn,
    _sessionFn: sessionFn,
    _execFn: execFn,
  };
};

describe('aggregation utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sanitizePipeline', () => {
    it('should return the pipeline when no forbidden stages are present', () => {
      const pipeline = [{ $match: { status: 'active' } }, { $group: { _id: '$status' } }];
      expect(sanitizePipeline(pipeline)).toBe(pipeline);
    });

    it('should reject $out stage', () => {
      expect(() => sanitizePipeline([{ $match: {} }, { $out: 'backup' } as any])).toThrow(
        'Forbidden aggregation stage: $out'
      );
    });

    it('should reject $merge stage', () => {
      expect(() =>
        sanitizePipeline([{ $match: {} }, { $merge: { into: 'backup' } } as any])
      ).toThrow('Forbidden aggregation stage: $merge');
    });
  });

  describe('buildFacetPagination', () => {
    it('should build a $facet stage with skip/limit and count', () => {
      const stage = buildFacetPagination(2, 10) as any;
      expect(stage).toEqual({
        $facet: {
          data: [{ $skip: 10 }, { $limit: 10 }],
          total: [{ $count: 'count' }],
        },
      });
    });

    it('should not allow negative skip', () => {
      const stage = buildFacetPagination(0, 10) as any;
      expect(stage.$facet.data[0]).toEqual({ $skip: 0 });
    });
  });

  describe('buildDateGroupStage', () => {
    it('should build a daily group stage by default', () => {
      const stage = buildDateGroupStage({ field: 'createdAt' }) as any;
      expect(stage).toEqual({
        $group: {
          _id: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } },
          count: { $sum: 1 },
        },
      });
    });

    it('should support monthly granularity', () => {
      const stage = buildDateGroupStage({ field: 'createdAt', granularity: 'month' }) as any;
      expect(stage.$group._id).toEqual({
        _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
      });
    });
  });

  describe('timedAggregate', () => {
    it('should execute a pipeline and return typed results', async () => {
      const mockModel = createMockModel([{ _id: 'active', count: 5 }]) as any;

      const result = await timedAggregate<{ _id: string; count: number }>(mockModel, [
        { $match: {} },
        { $group: { _id: '$status' } },
      ]);

      expect(result).toEqual([{ _id: 'active', count: 5 }]);
      expect(mockModel.aggregate).toHaveBeenCalled();
    });

    it('should apply session when provided', async () => {
      const mockModel = createMockModel([]) as any;
      const session = { id: 'session-1' } as any;

      await timedAggregate(mockModel, [{ $match: {} }], { session });

      expect(mockModel._sessionFn).toHaveBeenCalledWith(session);
    });

    it('should throw and log on aggregate errors', async () => {
      const mockModel = createMockModel([]) as any;
      mockModel._execFn.mockRejectedValue(new Error('aggregate failed'));

      await expect(timedAggregate(mockModel, [{ $match: {} }])).rejects.toThrow('aggregate failed');
    });
  });

  describe('paginatedAggregate', () => {
    it('should extract data and total from a facet result', async () => {
      const mockModel = createMockModel([
        {
          data: [{ _id: 'a' }, { _id: 'b' }],
          total: [{ count: 42 }],
        },
      ]) as any;

      const result = await paginatedAggregate<{ _id: string }>(mockModel, [{ $match: {} }], {
        page: 1,
        limit: 5,
      });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(42);
    });

    it('should default total to 0 when missing', async () => {
      const mockModel = createMockModel([{ data: [], total: [] }]) as any;

      const result = await paginatedAggregate(mockModel, [{ $match: {} }]);

      expect(result.total).toBe(0);
    });
  });
});
