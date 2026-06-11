"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectRepository = void 0;
const project_model_1 = require("./project.model");
const pagination_1 = require("../../utils/pagination");
/* ------------------------------------------------------------------ */
// Helpers
/* ------------------------------------------------------------------ */
const buildFilterQuery = (filter) => {
    const query = {};
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
exports.projectRepository = {
    /**
     * Find all projects with pagination, sorting, and optional filtering.
     */
    async findAll(options, filter = {}) {
        const query = buildFilterQuery(filter);
        const skip = (options.page - 1) * options.limit;
        const sortDirection = options.order === 'desc' ? -1 : 1;
        const [data, total] = await Promise.all([
            project_model_1.ProjectModel.find(query)
                .sort({ [options.sort]: sortDirection })
                .skip(skip)
                .limit(options.limit)
                .lean(),
            project_model_1.ProjectModel.countDocuments(query),
        ]);
        return {
            data,
            meta: (0, pagination_1.buildPaginationMeta)(options.page, options.limit, total),
        };
    },
    /**
     * Find a project by its MongoDB _id.
     */
    async findById(id) {
        return project_model_1.ProjectModel.findById(id).lean();
    },
    /**
     * Create a new project document.
     */
    async create(data) {
        return project_model_1.ProjectModel.create(data);
    },
    /**
     * Update a project by id. Returns the updated document or null if not found.
     */
    async updateById(id, data) {
        return project_model_1.ProjectModel.findByIdAndUpdate(id, data, { new: true }).lean();
    },
    /**
     * Delete a project by id. Returns true if a document was deleted.
     */
    async deleteById(id) {
        const result = await project_model_1.ProjectModel.findByIdAndDelete(id);
        return result !== null;
    },
    /**
     * Check whether a project with the given id exists.
     */
    async exists(id) {
        const doc = await project_model_1.ProjectModel.exists({ _id: id });
        return doc !== null;
    },
};
//# sourceMappingURL=project.repository.js.map