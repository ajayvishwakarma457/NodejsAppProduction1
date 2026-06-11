/**
 * RBAC helpers for ownership and role checks.
 */

export const isAdmin = (role?: string): boolean => role === 'admin';

export const isOwnerOrAdmin = (
  resourceOwnerId: string | unknown,
  userId: string,
  role?: string
): boolean => {
  if (isAdmin(role)) return true;
  return String(resourceOwnerId) === userId;
};
