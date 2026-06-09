import { TaskDocument, TaskModel } from "./task.model";

export const taskRepository = {
  async findAll(): Promise<TaskDocument[]> {
    return TaskModel.find().lean();
  }
};
