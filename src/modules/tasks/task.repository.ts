import { TaskDocument, TaskModel } from "./task.model";

export const taskRepository = {
  async findAll(): Promise<TaskDocument[]> {
    return TaskModel.find().lean();
  },

  async findById(id: string): Promise<TaskDocument | null> {
    return TaskModel.findById(id).lean();
  }
};
