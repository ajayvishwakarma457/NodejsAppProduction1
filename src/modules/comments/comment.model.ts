import { InferSchemaType, Schema, model } from "mongoose";

const commentSchema = new Schema(
  {
    taskId: { type: Schema.Types.ObjectId, ref: "Task", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true, trim: true }
  },
  {
    timestamps: true
  }
);

export type CommentDocument = InferSchemaType<typeof commentSchema>;

export const CommentModel = model<CommentDocument>("Comment", commentSchema);
