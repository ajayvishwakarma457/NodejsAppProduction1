import { UserDocument } from '../users/user.model';

export interface SanitizedUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  avatar: string | null;
  isVerified: boolean;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const sanitizeAuthUser = (user: UserDocument | Record<string, unknown>): SanitizedUser => {
  const u = user as Record<string, unknown>;

  return {
    id: String(u._id ?? u.id),
    firstName: String(u.firstName),
    lastName: String(u.lastName),
    email: String(u.email),
    role: String(u.role),
    avatar: (u.avatar as string | null) ?? null,
    isVerified: Boolean(u.isVerified),
    lastLogin: (u.lastLogin as Date | null) ?? null,
    createdAt: new Date(u.createdAt as Date | string),
    updatedAt: new Date(u.updatedAt as Date | string),
  };
};
