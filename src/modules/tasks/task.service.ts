import { taskRepository, TaskListFilter } from './task.repository';
import { getPagination } from '../../utils/pagination';

export const taskService = {
  async list(query: Record<string, unknown>) {
    const pagination = getPagination(query.page, query.limit, query.sort, query.order);

    const filter: TaskListFilter = {};

    if (query.projectId) {
      filter.projectId = String(query.projectId);
    }

    if (query.assignedTo) {
      filter.assignedTo = String(query.assignedTo);
    }

    if (query.createdBy) {
      filter.createdBy = String(query.createdBy);
    }

    if (query.status) {
      filter.status = String(query.status);
    }

    if (query.priority) {
      filter.priority = String(query.priority);
    }

    if (query.search) {
      filter.search = String(query.search);
    }

    return taskRepository.findAll(
      {
        page: pagination.page,
        limit: pagination.limit,
        sort: pagination.sort,
        order: pagination.order as 'asc' | 'desc',
      },
      filter
    );
  },

  async getById(id: string) {
    return taskRepository.findById(id);
  },

  async create(data: Record<string, unknown>) {
    return taskRepository.create(data);
  },

  async update(id: string, data: Record<string, unknown>) {
    return taskRepository.updateById(id, data);
  },

  async remove(id: string) {
    return taskRepository.deleteById(id);
  },

  async findDueInRange(start: Date, end: Date) {
    return taskRepository.findDueInRange(start, end);
  },

  async findOverdue(before: Date) {
    return taskRepository.findOverdue(before);
  },
};
