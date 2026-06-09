import { TaskDocument, TaskModel } from "./task.model";

export const taskRepository = {
  async findAll(): Promise<TaskDocument[]> {
    return TaskModel.find().lean();
  },

  async findById(id: string): Promise<TaskDocument | null> {
    return TaskModel.findById(id).lean();
  },

  async findDueInRange(start: Date, end: Date): Promise<TaskDocument[]> {
    return TaskModel.find({
      status: { $nin: ["done"] },
      dueDate: { $gte: start, $lte: end }
    })
      .populate("assignedTo", "email firstName lastName")
      .lean();
  },

  async findOverdue(before: Date): Promise<TaskDocument[]> {
    return TaskModel.find({
      status: { $nin: ["done"] },
      dueDate: { $lt: before }
    })
      .populate("assignedTo", "email firstName lastName")
      .lean();
  }
};
