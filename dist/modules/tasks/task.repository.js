"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskRepository = void 0;
const task_model_1 = require("./task.model");
const pagination_1 = require("../../utils/pagination");
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
        const [data, total] = await Promise.all([
            task_model_1.TaskModel.find(query)
                .sort({ [options.sort]: sortDirection })
                .skip(skip)
                .limit(options.limit)
                .lean(),
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
        return task_model_1.TaskModel.findById(id).lean();
    },
    /**
     * Find a task by id with project and user details populated.
     */
    async findByIdWithDetails(id) {
        return task_model_1.TaskModel.findById(id)
            .populate('projectId', 'name status')
            .populate('createdBy', 'firstName lastName email avatar')
            .populate('assignedTo', 'firstName lastName email avatar')
            .lean();
    },
    /**
     * Create a new task document.
     */
    async create(data) {
        return task_model_1.TaskModel.create(data);
    },
    /**
     * Update a task by id. Returns the updated document or null if not found.
     */
    async updateById(id, data) {
        return task_model_1.TaskModel.findByIdAndUpdate(id, data, { new: true }).lean();
    },
    /**
     * Delete a task by id. Returns true if a document was deleted.
     */
    async deleteById(id) {
        const result = await task_model_1.TaskModel.findByIdAndDelete(id);
        return result !== null;
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
        return task_model_1.TaskModel.find({
            status: { $nin: ['done'] },
            dueDate: { $gte: start, $lte: end },
        })
            .populate('assignedTo', 'email firstName lastName')
            .lean();
    },
    /**
     * Find overdue tasks that are not done.
     * Populates assignedTo for reminder job usage.
     */
    async findOverdue(before) {
        return task_model_1.TaskModel.find({
            status: { $nin: ['done'] },
            dueDate: { $lt: before },
        })
            .populate('assignedTo', 'email firstName lastName')
            .lean();
    },
};
//# sourceMappingURL=task.repository.js.map