import bcrypt from 'bcryptjs';
import { ClientSession, FilterQuery } from 'mongoose';
import { UserDocument, UserModel } from './user.model';
import { buildPaginationMeta, PaginationMeta } from '../../utils/pagination';
import { timedQuery, buildListProjection } from '../../utils/query-optimizer';

/* ------------------------------------------------------------------ */
// Types
/* ------------------------------------------------------------------ */

export interface UserListFilter {
  role?: string;
  isVerified?: boolean;
  search?: string;
}

export interface UserListOptions {
  page: number;
  limit: number;
  sort: string;
  order: 'asc' | 'desc';
}

export interface UserListResult {
  data: UserDocument[];
  meta: PaginationMeta;
}

/* ------------------------------------------------------------------ */
// Helpers
/* ------------------------------------------------------------------ */

const buildFilterQuery = (filter: UserListFilter): FilterQuery<UserDocument> => {
  const query: FilterQuery<UserDocument> = {};

  if (filter.role) {
    query.role = filter.role;
  }

  if (filter.isVerified !== undefined) {
    query.isVerified = filter.isVerified;
  }

  if (filter.search) {
    const searchRegex = { $regex: filter.search, $options: 'i' };
    query.$or = [{ firstName: searchRegex }, { lastName: searchRegex }, { email: searchRegex }];
  }

  return query;
};

/* ------------------------------------------------------------------ */
// Repository
/* ------------------------------------------------------------------ */

export const userRepository = {
  /**
   * Find all users with pagination, sorting, and optional filtering.
   */
  async findAll(options: UserListOptions, filter: UserListFilter = {}): Promise<UserListResult> {
    const query = buildFilterQuery(filter);
    const skip = (options.page - 1) * options.limit;
    const sortDirection = options.order === 'desc' ? -1 : 1;

    const listQuery = UserModel.find(query)
      .sort({ [options.sort]: sortDirection })
      .skip(skip)
      .limit(options.limit)
      .select(buildListProjection(['password', 'refreshToken']))
      .lean();

    const [data, total] = await Promise.all([
      timedQuery(listQuery, { collection: 'users', operation: 'findAll' }),
      UserModel.countDocuments(query),
    ]);

    return {
      data,
      meta: buildPaginationMeta(options.page, options.limit, total),
    };
  },

  /**
   * Find a user by their MongoDB _id.
   */
  async findById(id: string): Promise<UserDocument | null> {
    const query = UserModel.findById(id)
      .select(buildListProjection(['password', 'refreshToken']))
      .lean();
    return timedQuery(query, { collection: 'users', operation: 'findById' });
  },

  /**
   * Find a user by email (case-insensitive, trimmed).
   * Excludes password and refreshToken by default.
   */
  async findByEmail(email: string): Promise<UserDocument | null> {
    const query = UserModel.findOne({ email: email.toLowerCase().trim() })
      .select(buildListProjection(['password', 'refreshToken']))
      .lean();
    return timedQuery(query, { collection: 'users', operation: 'findByEmail' });
  },

  /**
   * Find a user by email and explicitly include sensitive fields
   * (password + refreshToken). Intended for authentication flows.
   */
  async findByEmailWithPassword(email: string): Promise<UserDocument | null> {
    const query = UserModel.findOne({ email: email.toLowerCase().trim() })
      .select('+password +refreshToken')
      .lean();
    return timedQuery(query, { collection: 'users', operation: 'findByEmailWithPassword' });
  },

  /**
   * Find a user by OAuth provider and providerId.
   */
  async findByProvider(provider: string, providerId: string): Promise<UserDocument | null> {
    const query = UserModel.findOne({ provider, providerId })
      .select(buildListProjection(['password', 'refreshToken']))
      .lean();
    return timedQuery(query, { collection: 'users', operation: 'findByProvider' });
  },

  /**
   * Create a new user document.
   */
  async create(data: Partial<UserDocument>, session?: ClientSession): Promise<UserDocument> {
    const doc = new UserModel(data);
    return doc.save({ session });
  },

  /**
   * Update a user by id. Returns the updated document or null if not found.
   */
  async updateById(
    id: string,
    data: Partial<UserDocument>,
    session?: ClientSession
  ): Promise<UserDocument | null> {
    const update = { ...data };

    if (update.password) {
      const salt = await bcrypt.genSalt(12);
      update.password = await bcrypt.hash(update.password, salt);
    }

    const query = UserModel.findByIdAndUpdate(id, update, { new: true, session })
      .select(buildListProjection(['password', 'refreshToken']))
      .lean();
    return timedQuery(query, { collection: 'users', operation: 'updateById' });
  },

  /**
   * Delete a user by id. Returns true if a document was deleted.
   */
  async deleteById(id: string, session?: ClientSession): Promise<boolean> {
    const result = await UserModel.findByIdAndDelete(id, { session });
    return result !== null;
  },

  /**
   * Delete multiple users matching a filter.
   */
  async deleteMany(filter: FilterQuery<UserDocument>, session?: ClientSession): Promise<number> {
    const result = await UserModel.deleteMany(filter, { session });
    return result.deletedCount ?? 0;
  },

  /**
   * Check whether a user with the given id exists.
   */
  async exists(id: string): Promise<boolean> {
    const doc = await UserModel.exists({ _id: id });
    return doc !== null;
  },

  /**
   * Count users matching the given filter.
   */
  async count(filter: UserListFilter = {}): Promise<number> {
    return UserModel.countDocuments(buildFilterQuery(filter));
  },

  /**
   * Update the lastLogin timestamp for a user.
   */
  async updateLastLogin(id: string): Promise<void> {
    await UserModel.findByIdAndUpdate(id, { lastLogin: new Date() });
  },
};
