import { InferSchemaType, Schema, Types, model } from 'mongoose';

const commentSchema = new Schema(
  {
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    parentId: { type: Schema.Types.ObjectId, ref: 'Comment', default: null, index: true },
    content: { type: String, required: true, trim: true, maxlength: 5000 },
  },
  {
    timestamps: true,
  }
);

commentSchema.index({ createdAt: -1 });
commentSchema.index({ taskId: 1, createdAt: -1 });

export type CommentDocument = InferSchemaType<typeof commentSchema> & { _id: Types.ObjectId };

export const CommentModel = model<CommentDocument>('Comment', commentSchema);
