import { userRepository, UserListFilter } from "./user.repository";
import { getPagination } from "../../utils/pagination";

export const userService = {
  async list(query: Record<string, unknown>) {
    const pagination = getPagination(
      query.page,
      query.limit,
      query.sort,
      query.order
    );

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
        order: pagination.order as "asc" | "desc"
      },
      filter
    );
  },

  async getById(id: string) {
    return userRepository.findById(id);
  },

  async create(data: Record<string, unknown>) {
    return userRepository.create(data);
  },

  async update(id: string, data: Record<string, unknown>) {
    return userRepository.updateById(id, data);
  },

  async remove(id: string) {
    return userRepository.deleteById(id);
  }
};
