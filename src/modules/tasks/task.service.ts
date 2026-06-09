import { taskRepository } from "./task.repository";

export const taskService = {
  async list() {
    return taskRepository.findAll();
  },

  async findById(id: string) {
    return taskRepository.findById(id);
  },

  async findDueInRange(start: Date, end: Date) {
    return taskRepository.findDueInRange(start, end);
  },

  async findOverdue(before: Date) {
    return taskRepository.findOverdue(before);
  }
};

