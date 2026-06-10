import { ApiError } from "../../utils/ApiError";
import { getPagination } from "../../utils/pagination";
import { CommentDocument } from "./comment.model";
import { commentRepository, CommentListFilter } from "./comment.repository";

export const commentService = {
  async list(query: Record<string, unknown>) {
    const pagination = getPagination(
      query.page,
      query.limit,
      query.sort,
      query.order
    );

    const filter: CommentListFilter = {};

    if (query.taskId) {
      filter.taskId = String(query.taskId);
    }

    if (query.userId) {
      filter.userId = String(query.userId);
    }

    return commentRepository.findAll(
      {
        page: pagination.page,
        limit: pagination.limit,
        sort: pagination.sort,
        order: pagination.order as "asc" | "desc"
      },
      filter
    );
  },

  async getById(id: string): Promise<CommentDocument | null> {
    return commentRepository.findByIdWithUser(id);
  },

  async create(data: Record<string, unknown>, userId: string): Promise<CommentDocument> {
    return commentRepository.create({
      ...data,
      userId
    });
  },

  async update(id: string, data: Record<string, unknown>, userId: string): Promise<CommentDocument | null> {
    const comment = await commentRepository.findById(id);

    if (!comment) {
      throw ApiError.notFound("Comment not found");
    }

    if (String(comment.userId) !== userId) {
      throw ApiError.forbidden("You can only update your own comments");
    }

    return commentRepository.updateById(id, data);
  },

  async remove(id: string, userId: string): Promise<boolean> {
    const comment = await commentRepository.findById(id);

    if (!comment) {
      throw ApiError.notFound("Comment not found");
    }

    if (String(comment.userId) !== userId) {
      throw ApiError.forbidden("You can only delete your own comments");
    }

    return commentRepository.deleteById(id);
  }
};
