import { ApiError } from '../../utils/ApiError';
import { getPagination } from '../../utils/pagination';
import { serializeDocument, serializeDocuments } from '../../utils/serializer';
import { commentRepository, CommentListFilter } from './comment.repository';

export const commentService = {
  async list(query: Record<string, unknown>) {
    const pagination = getPagination(query.page, query.limit, query.sort, query.order);

    const filter: CommentListFilter = {};

    if (query.taskId) {
      filter.taskId = String(query.taskId);
    }

    if (query.userId) {
      filter.userId = String(query.userId);
    }

    const result = await commentRepository.findAll(
      {
        page: pagination.page,
        limit: pagination.limit,
        sort: pagination.sort,
        order: pagination.order as 'asc' | 'desc',
      },
      filter
    );

    return {
      ...result,
      data: serializeDocuments(result.data as unknown as Record<string, unknown>[]),
    };
  },

  async getById(id: string): Promise<Record<string, unknown> | null> {
    const comment = await commentRepository.findByIdWithUser(id);
    return serializeDocument(comment as unknown as Record<string, unknown> | null);
  },

  async create(data: Record<string, unknown>, userId: string): Promise<Record<string, unknown>> {
    const comment = await commentRepository.create({
      ...data,
      userId,
    });
    return serializeDocument(comment as unknown as Record<string, unknown>)!;
  },

  async update(
    id: string,
    data: Record<string, unknown>,
    userId: string
  ): Promise<Record<string, unknown> | null> {
    const comment = await commentRepository.findById(id);

    if (!comment) {
      throw ApiError.notFound('Comment not found');
    }

    if (String(comment.userId) !== userId) {
      throw ApiError.forbidden('You can only update your own comments');
    }

    const updated = await commentRepository.updateById(id, data);
    return serializeDocument(updated as unknown as Record<string, unknown> | null);
  },

  async remove(id: string, userId: string): Promise<boolean> {
    const comment = await commentRepository.findById(id);

    if (!comment) {
      throw ApiError.notFound('Comment not found');
    }

    if (String(comment.userId) !== userId) {
      throw ApiError.forbidden('You can only delete your own comments');
    }

    return commentRepository.deleteById(id);
  },
};
