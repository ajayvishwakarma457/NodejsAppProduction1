import { PAGINATION } from "./constants";

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
  sort: string;
  order: "asc" | "desc";
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const toSafeNumber = (value: unknown, fallback: number): number => {
  const num = typeof value === "string" ? parseInt(value, 10) : Number(value);
  return Number.isFinite(num) && num > 0 ? num : fallback;
};

export const getPagination = (
  page?: unknown,
  limit?: unknown,
  sort?: unknown,
  order?: unknown
): PaginationParams => {
  const safePage = toSafeNumber(page, PAGINATION.defaultPage);
  const safeLimit = Math.min(
    toSafeNumber(limit, PAGINATION.defaultLimit),
    PAGINATION.maxLimit
  );
  const safeSort = typeof sort === "string" && sort.trim().length > 0
    ? sort.trim()
    : PAGINATION.defaultSort;
  const safeOrder = order === "desc" ? "desc" : "asc";

  return {
    page: safePage,
    limit: safeLimit,
    offset: (safePage - 1) * safeLimit,
    sort: safeSort,
    order: safeOrder
  };
};

export const buildPaginationMeta = (
  page: number,
  limit: number,
  total: number
): PaginationMeta => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit)
});
