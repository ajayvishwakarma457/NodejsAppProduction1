import { ClientSession, FilterQuery, Types, PipelineStage } from 'mongoose';
import { TaskDocument, TaskModel } from './task.model';
import { buildPaginationMeta, PaginationMeta } from '../../utils/pagination';
import { timedQuery, buildListProjection } from '../../utils/query-optimizer';
import { timedAggregate } from '../../utils/aggregation';

/* ------------------------------------------------------------------ */
// Types
/* ------------------------------------------------------------------ */

export interface TaskListFilter {
  projectId?: string;
  assignedTo?: string;
  createdBy?: string;
  status?: string;
  priority?: string;
  search?: string;
}

export interface TaskListOptions {
  page: number;
  limit: number;
  sort: string;
  order: 'asc' | 'desc';
}

export interface TaskListResult {
  data: TaskDocument[];
  meta: PaginationMeta;
}

/* ------------------------------------------------------------------ */
// Helpers
/* ------------------------------------------------------------------ */

const buildFilterQuery = (filter: TaskListFilter): FilterQuery<TaskDocument> => {
  const query: FilterQuery<TaskDocument> = {};

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

export const taskRepository = {
  /**
   * Find all tasks with pagination, sorting, and optional filtering.
   */
  async findAll(options: TaskListOptions, filter: TaskListFilter = {}): Promise<TaskListResult> {
    const query = buildFilterQuery(filter);
    const skip = (options.page - 1) * options.limit;
    const sortDirection = options.order === 'desc' ? -1 : 1;

    const listQuery = TaskModel.find(query)
      .sort({ [options.sort]: sortDirection })
      .skip(skip)
      .limit(options.limit)
      .select(buildListProjection())
      .lean();

    const [data, total] = await Promise.all([
      timedQuery(listQuery, { collection: 'tasks', operation: 'findAll' }),
      TaskModel.countDocuments(query),
    ]);

    return {
      data,
      meta: buildPaginationMeta(options.page, options.limit, total),
    };
  },

  /**
   * Find a task by its MongoDB _id.
   */
  async findById(id: string): Promise<TaskDocument | null> {
    const query = TaskModel.findById(id).select(buildListProjection()).lean();
    return timedQuery(query, { collection: 'tasks', operation: 'findById' });
  },

  /**
   * Find a task by id with project and user details populated.
   */
  async findByIdWithDetails(id: string): Promise<TaskDocument | null> {
    const query = TaskModel.findById(id)
      .populate('projectId', 'name status')
      .populate('createdBy', 'firstName lastName email avatar')
      .populate('assignedTo', 'firstName lastName email avatar')
      .lean();
    return timedQuery(query, { collection: 'tasks', operation: 'findByIdWithDetails' });
  },

  /**
   * Create a new task document.
   */
  async create(
    data: Partial<TaskDocument>,
    session?: ClientSession
  ): Promise<TaskDocument> {
    const doc = new TaskModel(data);
    return doc.save({ session });
  },

  /**
   * Update a task by id. Returns the updated document or null if not found.
   */
  async updateById(
    id: string,
    data: Partial<TaskDocument>,
    session?: ClientSession
  ): Promise<TaskDocument | null> {
    const query = TaskModel.findByIdAndUpdate(id, data, { new: true, session })
      .select(buildListProjection())
      .lean();
    return timedQuery(query, { collection: 'tasks', operation: 'updateById' });
  },

  /**
   * Delete a task by id. Returns true if a document was deleted.
   */
  async deleteById(id: string, session?: ClientSession): Promise<boolean> {
    const result = await TaskModel.findByIdAndDelete(id, { session });
    return result !== null;
  },

  /**
   * Delete multiple tasks matching a filter.
   */
  async deleteMany(filter: FilterQuery<TaskDocument>, session?: ClientSession): Promise<number> {
    const result = await TaskModel.deleteMany(filter, { session });
    return result.deletedCount ?? 0;
  },

  /**
   * Check whether a task with the given id exists.
   */
  async exists(id: string): Promise<boolean> {
    const doc = await TaskModel.exists({ _id: id });
    return doc !== null;
  },

  /**
   * Count tasks matching the given filter.
   */
  async count(filter: TaskListFilter = {}): Promise<number> {
    return TaskModel.countDocuments(buildFilterQuery(filter));
  },

  /**
   * Find tasks due within a date range that are not done.
   * Populates assignedTo for reminder job usage.
   */
  async findDueInRange(start: Date, end: Date): Promise<TaskDocument[]> {
    const query = TaskModel.find({
      status: { $nin: ['done'] },
      dueDate: { $gte: start, $lte: end },
    })
      .populate('assignedTo', 'email firstName lastName')
      .lean();
    return timedQuery(query, { collection: 'tasks', operation: 'findDueInRange' });
  },

  /**
   * Find overdue tasks that are not done.
   * Populates assignedTo for reminder job usage.
   */
  async findOverdue(before: Date): Promise<TaskDocument[]> {
    const query = TaskModel.find({
      status: { $nin: ['done'] },
      dueDate: { $lt: before },
    })
      .populate('assignedTo', 'email firstName lastName')
      .lean();
    return timedQuery(query, { collection: 'tasks', operation: 'findOverdue' });
  },

  /* ------------------------------------------------------------------ */
  // Aggregations
  /* ------------------------------------------------------------------ */

  /**
   * Distribution of tasks by status.
   */
  async getStatusDistribution(userId?: string): Promise<{ _id: string; count: number }[]> {
    const match: Record<string, unknown> = {};
    if (userId) {
      const id = new Types.ObjectId(userId);
      match.$or = [{ createdBy: id }, { assignedTo: id }];
    }

    const pipeline: PipelineStage[] = [
      { $match: match },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ];

    return timedAggregate<{ _id: string; count: number }>(TaskModel, pipeline, {
      operation: 'getStatusDistribution',
    });
  },

  /**
   * Distribution of tasks by priority.
   */
  async getPriorityDistribution(userId?: string): Promise<{ _id: string; count: number }[]> {
    const match: Record<string, unknown> = {};
    if (userId) {
      const id = new Types.ObjectId(userId);
      match.$or = [{ createdBy: id }, { assignedTo: id }];
    }

    const pipeline: PipelineStage[] = [
      { $match: match },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ];

    return timedAggregate<{ _id: string; count: number }>(TaskModel, pipeline, {
      operation: 'getPriorityDistribution',
    });
  },

  /**
   * Overdue summary: total open tasks and how many are overdue.
   */
  async getOverdueSummary(
    userId?: string,
    before: Date = new Date()
  ): Promise<{ total: number; overdue: number }> {
    const match: Record<string, unknown> = { status: { $nin: ['done'] } };
    if (userId) {
      const id = new Types.ObjectId(userId);
      match.$or = [{ createdBy: id }, { assignedTo: id }];
    }

    const pipeline: PipelineStage[] = [
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          overdue: {
            $sum: {
              $cond: [{ $and: [{ $ifNull: ['$dueDate', false] }, { $lt: ['$dueDate', before] }] }, 1, 0],
            },
          },
        },
      },
    ];

    const result = await timedAggregate<{ _id: null; total: number; overdue: number }>(
      TaskModel,
      pipeline,
      { operation: 'getOverdueSummary' }
    );

    return result[0] ?? { total: 0, overdue: 0 };
  },

  /**
   * Workload rollup per assignee: assigned count and completed count.
   */
  async getWorkloadByUser(
    userId?: string,
    limit = 10
  ): Promise<{ _id: string; assigned: number; done: number }[]> {
    const match: Record<string, unknown> = {};
    if (userId) {
      match.assignedTo = new Types.ObjectId(userId);
    }

    const pipeline: PipelineStage[] = [
      { $match: match },
      {
        $group: {
          _id: '$assignedTo',
          assigned: { $sum: 1 },
          done: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
        },
      },
      { $sort: { assigned: -1 } },
      { $limit: limit },
    ];

    return timedAggregate<{ _id: string; assigned: number; done: number }>(TaskModel, pipeline, {
      operation: 'getWorkloadByUser',
    });
  },
};
