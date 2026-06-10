import { FilterQuery } from "mongoose";
import { ProjectDocument, ProjectModel } from "./project.model";
import { buildPaginationMeta, PaginationMeta } from "../../utils/pagination";

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
  order: "asc" | "desc";
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
    const searchRegex = { $regex: filter.search, $options: "i" };
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
    const sortDirection = options.order === "desc" ? -1 : 1;

    const [data, total] = await Promise.all([
      ProjectModel.find(query)
        .sort({ [options.sort]: sortDirection })
        .skip(skip)
        .limit(options.limit)
        .lean(),
      ProjectModel.countDocuments(query)
    ]);

    return {
      data,
      meta: buildPaginationMeta(options.page, options.limit, total)
    };
  },

  /**
   * Find a project by its MongoDB _id.
   */
  async findById(id: string): Promise<ProjectDocument | null> {
    return ProjectModel.findById(id).lean();
  },

  /**
   * Create a new project document.
   */
  async create(data: Partial<ProjectDocument>): Promise<ProjectDocument> {
    return ProjectModel.create(data);
  },

  /**
   * Update a project by id. Returns the updated document or null if not found.
   */
  async updateById(
    id: string,
    data: Partial<ProjectDocument>
  ): Promise<ProjectDocument | null> {
    return ProjectModel.findByIdAndUpdate(id, data, { new: true }).lean();
  },

  /**
   * Delete a project by id. Returns true if a document was deleted.
   */
  async deleteById(id: string): Promise<boolean> {
    const result = await ProjectModel.findByIdAndDelete(id);
    return result !== null;
  },

  /**
   * Check whether a project with the given id exists.
   */
  async exists(id: string): Promise<boolean> {
    const doc = await ProjectModel.exists({ _id: id });
    return doc !== null;
  }
};
