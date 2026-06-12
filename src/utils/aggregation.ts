import { PipelineStage, ClientSession } from 'mongoose';
import { logger } from '../config/logger';

export const DEFAULT_AGGREGATE_TIMEOUT_MS = 5000;
export const SLOW_AGGREGATE_THRESHOLD_MS = 300;

export interface AggregateOptions {
  maxTimeMS?: number;
  allowDiskUse?: boolean;
  session?: ClientSession;
  operation?: string;
}

export interface AggregatePaginationOptions extends AggregateOptions {
  page?: number;
  limit?: number;
}

export interface FacetPaginationResult<T> {
  data: T[];
  total: number;
}

export interface DateGroupStageOptions {
  field: string;
  granularity?: 'day' | 'week' | 'month' | 'year';
  outputField?: string;
}

const FORBIDDEN_STAGES = new Set(['$out', '$merge']);

/**
 * Prevent write-stage aggregation pipelines from being executed accidentally.
 * Production aggregations should be read-only.
 */
export const sanitizePipeline = (pipeline: PipelineStage[]): PipelineStage[] => {
  for (const stage of pipeline) {
    const key = Object.keys(stage)[0];
    if (FORBIDDEN_STAGES.has(key)) {
      throw new Error(`Forbidden aggregation stage: ${key}`);
    }
  }
  return pipeline;
};

/**
 * Build a $facet stage for paginated aggregations.
 */
export const buildFacetPagination = (
  page = 1,
  limit = 10,
  dataStageName = 'data',
  totalStageName = 'total'
): PipelineStage => ({
  $facet: {
    [dataStageName]: [{ $skip: Math.max(0, (page - 1) * limit) }, { $limit: Math.max(1, limit) }],
    [totalStageName]: [{ $count: 'count' }],
  },
});

/**
 * Build a date-truncation group stage for time-series rollups.
 */
export const buildDateGroupStage = (options: DateGroupStageOptions): PipelineStage => {
  const { field, granularity = 'day', outputField = '_id' } = options;

  const dateToStringFormat: Record<NonNullable<DateGroupStageOptions['granularity']>, string> = {
    day: '%Y-%m-%d',
    week: '%Y-W%V',
    month: '%Y-%m',
    year: '%Y',
  };

  return {
    $group: {
      _id: { [outputField]: { $dateToString: { format: dateToStringFormat[granularity], date: `$${field}` } } },
      count: { $sum: 1 },
    },
  };
};

/**
 * Execute a Mongoose aggregation pipeline with safety defaults:
 * - max execution time
 * - disk use allowed for large sorts
 * - timing and slow-query logging
 * - sanitized pipeline (no $out/$merge)
 */
interface AggregateChain<T = unknown> {
  option: (opts: { maxTimeMS: number; allowDiskUse: boolean }) => AggregateChain<T>;
  session: (session: ClientSession) => AggregateChain<T>;
  exec: () => Promise<T[]>;
  explain: (verbosity: string) => Promise<unknown>;
}

interface AggregatableModel {
  collection: { collectionName: string };
  aggregate: <T = unknown>(pipeline: PipelineStage[]) => AggregateChain<T>;
}

export const timedAggregate = async <T>(
  model: AggregatableModel,
  pipeline: PipelineStage[],
  options: AggregateOptions = {}
): Promise<T[]> => {
  const { maxTimeMS = DEFAULT_AGGREGATE_TIMEOUT_MS, allowDiskUse = true, session } = options;
  sanitizePipeline(pipeline);

  const start = Date.now();
  const collection = model.collection.collectionName;

  try {
    let aggregate = model.aggregate(pipeline).option({ maxTimeMS, allowDiskUse });
    if (session) {
      aggregate = aggregate.session(session);
    }

    const result = (await aggregate.exec()) as T[];
    const durationMs = Date.now() - start;

    if (durationMs >= SLOW_AGGREGATE_THRESHOLD_MS) {
      logger.warn('Slow aggregation detected', {
        collection,
        operation: options.operation ?? 'aggregate',
        durationMs,
        stages: pipeline.length,
        thresholdMs: SLOW_AGGREGATE_THRESHOLD_MS,
      });
    }

    return result;
  } catch (error) {
    const durationMs = Date.now() - start;
    logger.error('Aggregation failed', {
      collection,
      operation: options.operation ?? 'aggregate',
      durationMs,
      stages: pipeline.length,
      error,
    });
    throw error;
  }
};

/**
 * Run a paginated aggregation using $facet and return `{ data, total }`.
 */
export const paginatedAggregate = async <T>(
  model: AggregatableModel,
  pipeline: PipelineStage[],
  options: AggregatePaginationOptions = {}
): Promise<FacetPaginationResult<T>> => {
  const { page = 1, limit = 10, ...aggregateOptions } = options;
  const facetStage = buildFacetPagination(page, limit);

  const result = await timedAggregate<Record<string, unknown[]>>(
    model,
    [...pipeline, facetStage],
    aggregateOptions
  );

  const first = result[0] ?? {};
  const data = (first.data ?? []) as T[];
  const total = ((first.total?.[0] as { count?: number } | undefined)?.count) ?? 0;

  return { data, total };
};

/**
 * Explain an aggregation pipeline without executing the data path.
 * Useful for index tuning in development/staging.
 */
export const explainAggregate = async (
  model: AggregatableModel,
  pipeline: PipelineStage[],
  options: AggregateOptions = {}
): Promise<unknown> => {
  const { maxTimeMS = DEFAULT_AGGREGATE_TIMEOUT_MS, allowDiskUse = true, session } = options;
  sanitizePipeline(pipeline);

  let aggregate = model.aggregate(pipeline).option({ maxTimeMS, allowDiskUse });
  if (session) {
    aggregate = aggregate.session(session);
  }

  return aggregate.explain('executionStats');
};
