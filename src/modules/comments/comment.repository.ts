import { ClientSession, FilterQuery } from 'mongoose';
import { CommentDocument, CommentModel } from './comment.model';
import { buildPaginationMeta, PaginationMeta } from '../../utils/pagination';

/* ------------------------------------------------------------------ */
// Types
/* ------------------------------------------------------------------ */

export interface CommentListFilter {
  taskId?: string;
  userId?: string;
}

export interface CommentListOptions {
  page: number;
  limit: number;
  sort: string;
  order: 'asc' | 'desc';
}

export interface CommentListResult {
  data: CommentDocument[];
  meta: PaginationMeta;
}

/* ------------------------------------------------------------------ */
// Helpers
/* ------------------------------------------------------------------ */

const buildFilterQuery = (filter: CommentListFilter): FilterQuery<CommentDocument> => {
  const query: FilterQuery<CommentDocument> = {};

  if (filter.taskId) {
    query.taskId = filter.taskId;
  }

  if (filter.userId) {
    query.userId = filter.userId;
  }

  return query;
};

/* ------------------------------------------------------------------ */
// Repository
/* ------------------------------------------------------------------ */

export const commentRepository = {
  /**
   * Find all comments with pagination, sorting, and optional filtering.
   */
  async findAll(
    options: CommentListOptions,
    filter: CommentListFilter = {}
  ): Promise<CommentListResult> {
    const query = buildFilterQuery(filter);
    const skip = (options.page - 1) * options.limit;
    const sortDirection = options.order === 'desc' ? -1 : 1;

    const [data, total] = await Promise.all([
      CommentModel.find(query)
        .sort({ [options.sort]: sortDirection })
        .skip(skip)
        .limit(options.limit)
        .lean(),
      CommentModel.countDocuments(query),
    ]);

    return {
      data,
      meta: buildPaginationMeta(options.page, options.limit, total),
    };
  },

  /**
   * Find a comment by its MongoDB _id.
   */
  async findById(id: string): Promise<CommentDocument | null> {
    return CommentModel.findById(id).lean();
  },

  /**
   * Find a comment by id with user details populated.
   */
  async findByIdWithUser(id: string): Promise<CommentDocument | null> {
    return CommentModel.findById(id).populate('userId', 'firstName lastName email avatar').lean();
  },

  /**
   * Find comments for a specific task.
   */
  async findByTaskId(taskId: string): Promise<CommentDocument[]> {
    return CommentModel.find({ taskId })
      .sort({ createdAt: -1 })
      .populate('userId', 'firstName lastName email avatar')
      .lean();
  },

  /**
   * Create a new comment document.
   */
  async create(
    data: Record<string, unknown>,
    session?: ClientSession
  ): Promise<CommentDocument> {
    const doc = new CommentModel(data);
    return doc.save({ session });
  },

  /**
   * Update a comment by id. Returns the updated document or null.
   */
  async updateById(
    id: string,
    data: Partial<CommentDocument>,
    session?: ClientSession
  ): Promise<CommentDocument | null> {
    return CommentModel.findByIdAndUpdate(id, data, { new: true, session }).lean();
  },

  /**
   * Delete a comment by id. Returns true if a document was deleted.
   */
  async deleteById(id: string, session?: ClientSession): Promise<boolean> {
    const result = await CommentModel.findByIdAndDelete(id, { session });
    return result !== null;
  },

  /**
   * Delete multiple comments matching a filter.
   */
  async deleteMany(filter: FilterQuery<CommentDocument>, session?: ClientSession): Promise<number> {
    const result = await CommentModel.deleteMany(filter, { session });
    return result.deletedCount ?? 0;
  },

  /**
   * Check whether a comment with the given id exists.
   */
  async exists(id: string): Promise<boolean> {
    const doc = await CommentModel.exists({ _id: id });
    return doc !== null;
  },
};
