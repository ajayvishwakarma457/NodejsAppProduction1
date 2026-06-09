import { CommentDocument, CommentModel } from "./comment.model";

export const commentRepository = {
  async findAll(): Promise<CommentDocument[]> {
    return CommentModel.find().lean();
  }
};
