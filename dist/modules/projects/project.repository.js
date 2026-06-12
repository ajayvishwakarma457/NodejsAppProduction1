"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectRepository = void 0;
const project_model_1 = require("./project.model");
const pagination_1 = require("../../utils/pagination");
const query_optimizer_1 = require("../../utils/query-optimizer");
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
        const listQuery = project_model_1.ProjectModel.find(query)
            .sort({ [options.sort]: sortDirection })
            .skip(skip)
            .limit(options.limit)
            .select((0, query_optimizer_1.buildListProjection)())
            .lean();
        const [data, total] = await Promise.all([
            (0, query_optimizer_1.timedQuery)(listQuery, { collection: 'projects', operation: 'findAll' }),
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
        const query = project_model_1.ProjectModel.findById(id).select((0, query_optimizer_1.buildListProjection)()).lean();
        return (0, query_optimizer_1.timedQuery)(query, { collection: 'projects', operation: 'findById' });
    },
    /**
     * Create a new project document.
     */
    async create(data, session) {
        const doc = new project_model_1.ProjectModel(data);
        return doc.save({ session });
    },
    /**
     * Update a project by id. Returns the updated document or null if not found.
     */
    async updateById(id, data, session) {
        const query = project_model_1.ProjectModel.findByIdAndUpdate(id, data, { new: true, session })
            .select((0, query_optimizer_1.buildListProjection)())
            .lean();
        return (0, query_optimizer_1.timedQuery)(query, { collection: 'projects', operation: 'updateById' });
    },
    /**
     * Delete a project by id. Returns true if a document was deleted.
     */
    async deleteById(id, session) {
        const result = await project_model_1.ProjectModel.findByIdAndDelete(id, { session });
        return result !== null;
    },
    /**
     * Delete multiple projects matching a filter.
     */
    async deleteMany(filter, session) {
        const result = await project_model_1.ProjectModel.deleteMany(filter, { session });
        return result.deletedCount ?? 0;
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