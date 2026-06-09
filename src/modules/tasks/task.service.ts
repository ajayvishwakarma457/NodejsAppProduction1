import { taskRepository } from "./task.repository";

export const taskService = {
  async list() {
    return taskRepository.findAll();
  },

  async findById(id: string) {
    return taskRepository.findById(id);
  }
};

