import { APP_CONSTANTS } from "./constants";

export const getPagination = (page?: number, limit?: number) => {
  const safePage = Math.max(page ?? APP_CONSTANTS.pagination.defaultPage, 1);
  const safeLimit = Math.min(
    Math.max(limit ?? APP_CONSTANTS.pagination.defaultLimit, 1),
    APP_CONSTANTS.pagination.maxLimit
  );

  return {
    page: safePage,
    limit: safeLimit,
    offset: (safePage - 1) * safeLimit
  };
};

