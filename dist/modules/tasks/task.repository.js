"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskRepository = void 0;
const task_model_1 = require("./task.model");
const pagination_1 = require("../../utils/pagination");
const query_optimizer_1 = require("../../utils/query-optimizer");
/* ------------------------------------------------------------------ */
// Helpers
/* ------------------------------------------------------------------ */
const buildFilterQuery = (filter) => {
    const query = {};
    if (filter.projectId) {
        query.projectId = filter.projectId;
    }
    if (filter.assignedTo) {
        query.assignedTo = filter.assignedTo;
    }
    if (filter.createdBy) {
        query.createdBy = filter.createdBy;
    }
    if (filter.status) {
        query.status = filter.status;
    }
    if (filter.priority) {
        query.priority = filter.priority;
    }
    if (filter.search) {
        const searchRegex = { $regex: filter.search, $options: 'i' };
        query.$or = [{ title: searchRegex }, { description: searchRegex }];
    }
    return query;
};
/* ------------------------------------------------------------------ */
// Repository
/* ------------------------------------------------------------------ */
exports.taskRepository = {
    /**
     * Find all tasks with pagination, sorting, and optional filtering.
     */
    async findAll(options, filter = {}) {
        const query = buildFilterQuery(filter);
        const skip = (options.page - 1) * options.limit;
        const sortDirection = options.order === 'desc' ? -1 : 1;
        const listQuery = task_model_1.TaskModel.find(query)
            .sort({ [options.sort]: sortDirection })
            .skip(skip)
            .limit(options.limit)
            .select((0, query_optimizer_1.buildListProjection)())
            .lean();
        const [data, total] = await Promise.all([
            (0, query_optimizer_1.timedQuery)(listQuery, { collection: 'tasks', operation: 'findAll' }),
            task_model_1.TaskModel.countDocuments(query),
        ]);
        return {
            data,
            meta: (0, pagination_1.buildPaginationMeta)(options.page, options.limit, total),
        };
    },
    /**
     * Find a task by its MongoDB _id.
     */
    async findById(id) {
        const query = task_model_1.TaskModel.findById(id).select((0, query_optimizer_1.buildListProjection)()).lean();
        return (0, query_optimizer_1.timedQuery)(query, { collection: 'tasks', operation: 'findById' });
    },
    /**
     * Find a task by id with project and user details populated.
     */
    async findByIdWithDetails(id) {
        const query = task_model_1.TaskModel.findById(id)
            .populate('projectId', 'name status')
            .populate('createdBy', 'firstName lastName email avatar')
            .populate('assignedTo', 'firstName lastName email avatar')
            .lean();
        return (0, query_optimizer_1.timedQuery)(query, { collection: 'tasks', operation: 'findByIdWithDetails' });
    },
    /**
     * Create a new task document.
     */
    async create(data, session) {
        const doc = new task_model_1.TaskModel(data);
        return doc.save({ session });
    },
    /**
     * Update a task by id. Returns the updated document or null if not found.
     */
    async updateById(id, data, session) {
        const query = task_model_1.TaskModel.findByIdAndUpdate(id, data, { new: true, session })
            .select((0, query_optimizer_1.buildListProjection)())
            .lean();
        return (0, query_optimizer_1.timedQuery)(query, { collection: 'tasks', operation: 'updateById' });
    },
    /**
     * Delete a task by id. Returns true if a document was deleted.
     */
    async deleteById(id, session) {
        const result = await task_model_1.TaskModel.findByIdAndDelete(id, { session });
        return result !== null;
    },
    /**
     * Delete multiple tasks matching a filter.
     */
    async deleteMany(filter, session) {
        const result = await task_model_1.TaskModel.deleteMany(filter, { session });
        return result.deletedCount ?? 0;
    },
    /**
     * Check whether a task with the given id exists.
     */
    async exists(id) {
        const doc = await task_model_1.TaskModel.exists({ _id: id });
        return doc !== null;
    },
    /**
     * Count tasks matching the given filter.
     */
    async count(filter = {}) {
        return task_model_1.TaskModel.countDocuments(buildFilterQuery(filter));
    },
    /**
     * Find tasks due within a date range that are not done.
     * Populates assignedTo for reminder job usage.
     */
    async findDueInRange(start, end) {
        const query = task_model_1.TaskModel.find({
            status: { $nin: ['done'] },
            dueDate: { $gte: start, $lte: end },
        })
            .populate('assignedTo', 'email firstName lastName')
            .lean();
        return (0, query_optimizer_1.timedQuery)(query, { collection: 'tasks', operation: 'findDueInRange' });
    },
    /**
     * Find overdue tasks that are not done.
     * Populates assignedTo for reminder job usage.
     */
    async findOverdue(before) {
        const query = task_model_1.TaskModel.find({
            status: { $nin: ['done'] },
            dueDate: { $lt: before },
        })
            .populate('assignedTo', 'email firstName lastName')
            .lean();
        return (0, query_optimizer_1.timedQuery)(query, { collection: 'tasks', operation: 'findOverdue' });
    },
};
//# sourceMappingURL=task.repository.js.map