import mongoose, { Query } from 'mongoose';
import { logger } from '../config/logger';

export const DEFAULT_QUERY_TIMEOUT_MS = 5000;
export const SLOW_QUERY_THRESHOLD_MS = 300;

export interface QueryMetrics {
  collection: string;
  operation: string;
  durationMs: number;
  filter?: unknown;
  count?: number;
}

export interface CursorPaginationInput {
  cursor?: string;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface CursorPaginationResult<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * Apply a maximum execution time to a Mongoose query.
 * Prevents runaway queries from consuming database resources.
 */
export const withTimeout = <T>(query: Query<T, unknown>, ms = DEFAULT_QUERY_TIMEOUT_MS): Query<T, unknown> => {
  return query.maxTimeMS(ms);
};

/**
 * Log queries that exceed the slow query threshold.
 */
export const logSlowQuery = (metrics: QueryMetrics): void => {
  if (metrics.durationMs < SLOW_QUERY_THRESHOLD_MS) return;

  logger.warn('Slow query detected', {
    ...metrics,
    thresholdMs: SLOW_QUERY_THRESHOLD_MS,
  });
};

/**
 * Wrap a Mongoose query execution with timing and slow-query logging.
 */
export const timedQuery = async <T>(
  query: Query<T, unknown>,
  options: { collection: string; operation: string; timeoutMs?: number }
): Promise<T> => {
  const start = Date.now();
  const q = options.timeoutMs !== undefined ? withTimeout(query, options.timeoutMs) : query;

  try {
    const result = await q.lean().exec();
    const durationMs = Date.now() - start;

    logSlowQuery({
      collection: options.collection,
      operation: options.operation,
      durationMs,
      filter: q.getFilter?.(),
      count: Array.isArray(result) ? result.length : undefined,
    });

    return result as T;
  } catch (error) {
    const durationMs = Date.now() - start;
    logger.error('Query failed', {
      collection: options.collection,
      operation: options.operation,
      durationMs,
      error,
    });
    throw error;
  }
};

/**
 * Build a regex-based case-insensitive search filter for the given fields.
 * Prefer text indexes for large collections; this helper is suitable for
 * smaller datasets or fields that need substring matching.
 */
export const buildRegexSearchFilter = (search: string, fields: string[]): Record<string, unknown> => {
  const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = { $regex: escaped, $options: 'i' };
  return { $or: fields.map((field) => ({ [field]: regex })) };
};

/**
 * Build a MongoDB text search filter when a text index exists.
 */
export const buildTextSearchFilter = (search: string): Record<string, unknown> => {
  return { $text: { $search: search } };
};

/**
 * Determine whether a text search can be used. Requires the collection to
 * have a text index. Falls back to regex search when uncertain.
 */
export const canUseTextSearch = async (collectionName: string): Promise<boolean> => {
  try {
    const db = mongoose.connection.db;
    if (!db) return false;

    const indexes = await db.collection(collectionName).indexes();
    return indexes.some((index) => index.key && Object.values(index.key).includes('text'));
  } catch {
    return false;
  }
};

/**
 * Encode a cursor for cursor-based pagination.
 */
export const encodeCursor = (value: Record<string, unknown>): string => {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
};

/**
 * Decode a cursor for cursor-based pagination.
 */
export const decodeCursor = (cursor: string): Record<string, unknown> => {
  try {
    return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf-8'));
  } catch {
    throw new Error('Invalid cursor');
  }
};

/**
 * Apply cursor-based pagination to a Mongoose query.
 * The cursor must contain the sort field value and `_id` for tie-breaking.
 */
export const applyCursorPagination = async <T extends Record<string, unknown>>(
  query: Query<T[], unknown>,
  input: CursorPaginationInput,
  sortField = 'createdAt'
): Promise<CursorPaginationResult<T>> => {
  const limit = Math.min(Math.max(input.limit ?? 10, 1), 100);
  const order = input.order === 'asc' ? 1 : -1;
  const sort = input.sort ?? sortField;

  if (input.cursor) {
    const cursor = decodeCursor(input.cursor);
    const sortValue = cursor[sort];
    const idValue = cursor._id;

    query = query.find({
      $or: [
        { [sort]: order === 1 ? { $gt: sortValue } : { $lt: sortValue } },
        {
          [sort]: sortValue,
          _id: order === 1 ? { $gt: idValue } : { $lt: idValue },
        },
      ],
    } as mongoose.FilterQuery<T>) as Query<T[], unknown>;
  }

  query = query.sort({ [sort]: order, _id: order }).limit(limit + 1);

  const results = (await query.lean().exec()) as unknown as T[];
  const hasMore = results.length > limit;
  const data = hasMore ? results.slice(0, -1) : results;

  let nextCursor: string | null = null;
  if (hasMore && data.length > 0) {
    const last = data[data.length - 1];
    nextCursor = encodeCursor({
      [sort]: last[sort],
      _id: last._id,
    });
  }

  return { data, nextCursor, hasMore };
};

/**
 * Recommend a projection that covers common list endpoints.
 * Removes heavy or sensitive fields by default.
 */
export const buildListProjection = (excludedFields: string[] = []): Record<string, 0> => {
  const defaults = ['__v'];
  const all = Array.from(new Set([...defaults, ...excludedFields]));
  return all.reduce((acc, field) => ({ ...acc, [field]: 0 }), {} as Record<string, 0>);
};
