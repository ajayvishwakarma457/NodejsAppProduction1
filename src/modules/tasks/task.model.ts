import { InferSchemaType, Schema, model } from "mongoose";

const taskSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium"
    },
    status: {
      type: String,
      enum: ["todo", "in-progress", "review", "done"],
      default: "todo"
    },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", required: true },
    dueDate: { type: Date },
    estimatedHours: { type: Number, default: 0 },
    actualHours: { type: Number, default: 0 }
  },
  {
    timestamps: true
  }
);

export type TaskDocument = InferSchemaType<typeof taskSchema>;

export const TaskModel = model<TaskDocument>("Task", taskSchema);
