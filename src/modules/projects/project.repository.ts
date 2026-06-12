import { ClientSession, FilterQuery } from 'mongoose';
import { ProjectDocument, ProjectModel } from './project.model';
import { buildPaginationMeta, PaginationMeta } from '../../utils/pagination';
import { timedQuery, buildListProjection } from '../../utils/query-optimizer';

/* ------------------------------------------------------------------ */
// Types
/* ------------------------------------------------------------------ */

export interface ProjectListFilter {
  status?: string;
  ownerId?: string;
  teamId?: string;
  search?: string;
}

export interface ProjectListOptions {
  page: number;
  limit: number;
  sort: string;
  order: 'asc' | 'desc';
}

export interface ProjectListResult {
  data: ProjectDocument[];
  meta: PaginationMeta;
}

/* ------------------------------------------------------------------ */
// Helpers
/* ------------------------------------------------------------------ */

const buildFilterQuery = (filter: ProjectListFilter): FilterQuery<ProjectDocument> => {
  const query: FilterQuery<ProjectDocument> = {};

  if (filter.status) {
    query.status = filter.status;
  }

  if (filter.ownerId) {
    query.ownerId = filter.ownerId;
  }

  if (filter.teamId) {
    query.teamId = filter.teamId;
  }

  if (filter.search) {
    const searchRegex = { $regex: filter.search, $options: 'i' };
    query.$or = [{ name: searchRegex }, { description: searchRegex }];
  }

  return query;
};

/* ------------------------------------------------------------------ */
// Repository
/* ------------------------------------------------------------------ */

export const projectRepository = {
  /**
   * Find all projects with pagination, sorting, and optional filtering.
   */
  async findAll(
    options: ProjectListOptions,
    filter: ProjectListFilter = {}
  ): Promise<ProjectListResult> {
    const query = buildFilterQuery(filter);
    const skip = (options.page - 1) * options.limit;
    const sortDirection = options.order === 'desc' ? -1 : 1;

    const listQuery = ProjectModel.find(query)
      .sort({ [options.sort]: sortDirection })
      .skip(skip)
      .limit(options.limit)
      .select(buildListProjection())
      .lean();

    const [data, total] = await Promise.all([
      timedQuery(listQuery, { collection: 'projects', operation: 'findAll' }),
      ProjectModel.countDocuments(query),
    ]);

    return {
      data,
      meta: buildPaginationMeta(options.page, options.limit, total),
    };
  },

  /**
   * Find a project by its MongoDB _id.
   */
  async findById(id: string): Promise<ProjectDocument | null> {
    const query = ProjectModel.findById(id).select(buildListProjection()).lean();
    return timedQuery(query, { collection: 'projects', operation: 'findById' });
  },

  /**
   * Create a new project document.
   */
  async create(
    data: Partial<ProjectDocument>,
    session?: ClientSession
  ): Promise<ProjectDocument> {
    const doc = new ProjectModel(data);
    return doc.save({ session });
  },

  /**
   * Update a project by id. Returns the updated document or null if not found.
   */
  async updateById(
    id: string,
    data: Partial<ProjectDocument>,
    session?: ClientSession
  ): Promise<ProjectDocument | null> {
    const query = ProjectModel.findByIdAndUpdate(id, data, { new: true, session })
      .select(buildListProjection())
      .lean();
    return timedQuery(query, { collection: 'projects', operation: 'updateById' });
  },

  /**
   * Delete a project by id. Returns true if a document was deleted.
   */
  async deleteById(id: string, session?: ClientSession): Promise<boolean> {
    const result = await ProjectModel.findByIdAndDelete(id, { session });
    return result !== null;
  },

  /**
   * Delete multiple projects matching a filter.
   */
  async deleteMany(filter: FilterQuery<ProjectDocument>, session?: ClientSession): Promise<number> {
    const result = await ProjectModel.deleteMany(filter, { session });
    return result.deletedCount ?? 0;
  },

  /**
   * Check whether a project with the given id exists.
   */
  async exists(id: string): Promise<boolean> {
    const doc = await ProjectModel.exists({ _id: id });
    return doc !== null;
  },
};
