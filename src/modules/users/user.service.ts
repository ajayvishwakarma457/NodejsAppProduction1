import mongoose from 'mongoose';
import { userRepository, UserListFilter } from './user.repository';
import { cacheAside, CACHE_NAMESPACE } from '../../utils/cache';
import { TeamModel } from '../teams/team.model';
import { ProjectModel } from '../projects/project.model';
import { TaskModel } from '../tasks/task.model';
import { CommentModel } from '../comments/comment.model';
import { NotificationModel } from '../notifications/notification.model';
import { apiKeyRepository } from '../api-keys/api-key.repository';
import { getPagination } from '../../utils/pagination';
import { withTransaction } from '../../utils/transaction';

export const userService = {
  async list(query: Record<string, unknown>) {
    const pagination = getPagination(query.page, query.limit, query.sort, query.order);

    const filter: UserListFilter = {};

    if (query.role) {
      filter.role = String(query.role);
    }

    if (query.isVerified !== undefined) {
      filter.isVerified = Boolean(query.isVerified);
    }

    if (query.search) {
      filter.search = String(query.search);
    }

    return userRepository.findAll(
      {
        page: pagination.page,
        limit: pagination.limit,
        sort: pagination.sort,
        order: pagination.order as 'asc' | 'desc',
      },
      filter
    );
  },

  async getById(id: string) {
    return cacheAside.getOrSet(CACHE_NAMESPACE.users, id, () => userRepository.findById(id));
  },

  async create(data: Record<string, unknown>) {
    return userRepository.create(data);
  },

  async update(id: string, data: Record<string, unknown>) {
    const updated = await userRepository.updateById(id, data);
    if (updated) {
      await cacheAside.invalidateEntity(CACHE_NAMESPACE.users, id);
    }
    return updated;
  },

  async remove(id: string) {
    return withTransaction(async ({ session }) => {
      const userObjectId = new mongoose.Types.ObjectId(id);

      const ownedTeamIds = await TeamModel.distinct(
        '_id',
        { ownerId: userObjectId },
        { session: session ?? undefined }
      );
      const memberTeamIds = await TeamModel.distinct(
        '_id',
        { 'members.userId': userObjectId },
        { session: session ?? undefined }
      );
      const allTeamIds = Array.from(new Set([...ownedTeamIds, ...memberTeamIds]));

      const projectIds = await ProjectModel.distinct(
        '_id',
        { $or: [{ ownerId: userObjectId }, { teamId: { $in: allTeamIds } }] },
        { session: session ?? undefined }
      );

      const taskIds = await TaskModel.distinct(
        '_id',
        {
          $or: [
            { createdBy: userObjectId },
            { assignedTo: userObjectId },
            { projectId: { $in: projectIds } },
          ],
        },
        { session: session ?? undefined }
      );

      await CommentModel.deleteMany(
        {
          $or: [{ userId: userObjectId }, { taskId: { $in: taskIds } }],
        },
        { session: session ?? undefined }
      );

      await TaskModel.deleteMany(
        {
          $or: [
            { createdBy: userObjectId },
            { assignedTo: userObjectId },
            { projectId: { $in: projectIds } },
          ],
        },
        { session: session ?? undefined }
      );

      await ProjectModel.deleteMany(
        {
          $or: [{ ownerId: userObjectId }, { teamId: { $in: ownedTeamIds } }],
        },
        { session: session ?? undefined }
      );

      await TeamModel.deleteMany({ ownerId: userObjectId }, { session: session ?? undefined });
      await TeamModel.updateMany(
        { 'members.userId': userObjectId },
        { $pull: { members: { userId: userObjectId } } },
        { session: session ?? undefined }
      );

      await NotificationModel.deleteMany(
        { userId: userObjectId },
        { session: session ?? undefined }
      );
      await apiKeyRepository.deleteMany({ userId: userObjectId }, session ?? undefined);

      const deleted = await userRepository.deleteById(id, session ?? undefined);
      if (deleted) {
        await cacheAside.invalidateEntity(CACHE_NAMESPACE.users, id);
      }
      return deleted;
    });
  },
};
