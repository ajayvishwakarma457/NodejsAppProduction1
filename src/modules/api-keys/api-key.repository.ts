import { ClientSession, FilterQuery } from 'mongoose';
import { ApiKeyDocument, ApiKeyModel } from './api-key.model';
import { buildPaginationMeta, PaginationMeta } from '../../utils/pagination';
import { timedQuery, buildListProjection } from '../../utils/query-optimizer';

/* ------------------------------------------------------------------ */
// Types
/* ------------------------------------------------------------------ */

export interface ApiKeyListFilter {
  userId?: string;
  isActive?: boolean;
  scopes?: string[];
}

export interface ApiKeyListOptions {
  page: number;
  limit: number;
  sort: string;
  order: 'asc' | 'desc';
}

export interface ApiKeyListResult {
  data: ApiKeyDocument[];
  meta: PaginationMeta;
}

/* ------------------------------------------------------------------ */
// Helpers
/* ------------------------------------------------------------------ */

const buildFilterQuery = (filter: ApiKeyListFilter): FilterQuery<ApiKeyDocument> => {
  const query: FilterQuery<ApiKeyDocument> = {};

  if (filter.userId) {
    query.userId = filter.userId;
  }

  if (filter.isActive !== undefined) {
    query.isActive = filter.isActive;
  }

  if (filter.scopes && filter.scopes.length > 0) {
    query.scopes = { $all: filter.scopes };
  }

  return query;
};

/* ------------------------------------------------------------------ */
// Repository
/* ------------------------------------------------------------------ */

export const apiKeyRepository = {
  /**
   * Find all API keys with pagination, sorting, and optional filtering.
   */
  async findAll(
    options: ApiKeyListOptions,
    filter: ApiKeyListFilter = {}
  ): Promise<ApiKeyListResult> {
    const query = buildFilterQuery(filter);
    const skip = (options.page - 1) * options.limit;
    const sortDirection = options.order === 'desc' ? -1 : 1;

    const listQuery = ApiKeyModel.find(query)
      .sort({ [options.sort]: sortDirection })
      .skip(skip)
      .limit(options.limit)
      .select(buildListProjection())
      .lean();

    const [data, total] = await Promise.all([
      timedQuery(listQuery, { collection: 'api_keys', operation: 'findAll' }),
      ApiKeyModel.countDocuments(query),
    ]);

    return {
      data,
      meta: buildPaginationMeta(options.page, options.limit, total),
    };
  },

  /**
   * Find an API key by its MongoDB _id.
   */
  async findById(id: string): Promise<ApiKeyDocument | null> {
    const query = ApiKeyModel.findById(id).select(buildListProjection()).lean();
    return timedQuery(query, { collection: 'api_keys', operation: 'findById' });
  },

  /**
   * Find an API key by its public id.
   */
  async findByPublicId(publicId: string): Promise<ApiKeyDocument | null> {
    const query = ApiKeyModel.findOne({ publicId })
      .select(buildListProjection())
      .lean();
    return timedQuery(query, { collection: 'api_keys', operation: 'findByPublicId' });
  },

  /**
   * Find an active, non-expired API key by its public id.
   */
  async findActiveByPublicId(publicId: string): Promise<ApiKeyDocument | null> {
    const query = ApiKeyModel.findOne({
      publicId,
      isActive: true,
      expiresAt: { $gt: new Date() },
    })
      .select('+keyHash')
      .lean();
    return timedQuery(query, { collection: 'api_keys', operation: 'findActiveByPublicId' });
  },

  /**
   * Find an API key by its hashed key value.
   */
  async findByKeyHash(keyHash: string): Promise<ApiKeyDocument | null> {
    const query = ApiKeyModel.findOne({ keyHash })
      .select(buildListProjection())
      .lean();
    return timedQuery(query, { collection: 'api_keys', operation: 'findByKeyHash' });
  },

  /**
   * Find API keys for a specific user.
   */
  async findByUserId(userId: string): Promise<ApiKeyDocument[]> {
    const query = ApiKeyModel.find({ userId })
      .sort({ createdAt: -1 })
      .select(buildListProjection())
      .lean();
    return timedQuery(query, { collection: 'api_keys', operation: 'findByUserId' });
  },

  /**
   * Create a new API key document.
   */
  async create(
    data: Partial<ApiKeyDocument>,
    session?: ClientSession
  ): Promise<ApiKeyDocument> {
    const doc = new ApiKeyModel(data);
    return doc.save({ session });
  },

  /**
   * Update an API key by id. Returns the updated document or null.
   */
  async updateById(
    id: string,
    data: Partial<ApiKeyDocument>,
    session?: ClientSession
  ): Promise<ApiKeyDocument | null> {
    const query = ApiKeyModel.findByIdAndUpdate(id, data, { new: true, session })
      .select(buildListProjection())
      .lean();
    return timedQuery(query, { collection: 'api_keys', operation: 'updateById' });
  },

  /**
   * Update the lastUsedAt timestamp for an API key.
   */
  async updateLastUsed(id: string, session?: ClientSession): Promise<void> {
    await ApiKeyModel.updateOne({ _id: id }, { lastUsedAt: new Date() }, { session });
  },

  /**
   * Revoke an API key by id. Returns true if a document was modified.
   */
  async revokeById(id: string, session?: ClientSession): Promise<boolean> {
    const result = await ApiKeyModel.updateOne(
      { _id: id },
      { isActive: false, revokedAt: new Date() },
      { session }
    );
    return result.matchedCount > 0;
  },

  /**
   * Revoke an API key by id and owner userId.
   * Returns true if a document was modified.
   */
  async revokeByIdAndUserId(
    id: string,
    userId: string,
    session?: ClientSession
  ): Promise<boolean> {
    const result = await ApiKeyModel.updateOne(
      { _id: id, userId },
      { isActive: false, revokedAt: new Date() },
      { session }
    );
    return result.matchedCount > 0;
  },

  /**
   * Delete an API key by id. Returns true if a document was deleted.
   */
  async deleteById(id: string, session?: ClientSession): Promise<boolean> {
    const result = await ApiKeyModel.findByIdAndDelete(id, { session });
    return result !== null;
  },

  /**
   * Delete multiple API keys matching a filter.
   */
  async deleteMany(filter: FilterQuery<ApiKeyDocument>, session?: ClientSession): Promise<number> {
    const result = await ApiKeyModel.deleteMany(filter, { session });
    return result.deletedCount ?? 0;
  },

  /**
   * Check whether an API key with the given id exists.
   */
  async exists(id: string): Promise<boolean> {
    const doc = await ApiKeyModel.exists({ _id: id });
    return doc !== null;
  },

  /**
   * Count active API keys for a user.
   */
  async countActiveByUserId(userId: string): Promise<number> {
    return ApiKeyModel.countDocuments({
      userId,
      isActive: true,
      expiresAt: { $gt: new Date() },
    });
  },

  /**
   * Revoke all active API keys for a user.
   * Returns the number of documents modified.
   */
  async revokeAllByUserId(userId: string, session?: ClientSession): Promise<number> {
    const result = await ApiKeyModel.updateMany(
      { userId, isActive: true },
      { isActive: false, revokedAt: new Date() },
      { session }
    );
    return result.modifiedCount ?? 0;
  },

  /**
   * Delete expired API keys older than their expiresAt date.
   * Returns the number of documents deleted.
   */
  async deleteExpired(): Promise<number> {
    const result = await ApiKeyModel.deleteMany({
      expiresAt: { $lt: new Date() },
    });
    return result.deletedCount ?? 0;
  },
};
