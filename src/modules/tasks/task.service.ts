import { taskRepository } from "./task.repository";

export const taskService = {
  async list() {
    return taskRepository.findAll();
  }
};

