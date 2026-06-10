import bcrypt from 'bcryptjs';
import { ApiError } from '../../utils/ApiError';
import { tokenService } from '../../services/token.service';
import { authRepository } from './auth.repository';
import { userRepository } from '../users/user.repository';
import { sanitizeAuthUser, SanitizedUser } from './auth.utils';
import { TokenPair } from '../../services/token.service';

export interface AuthResult {
  user: SanitizedUser;
  tokens: TokenPair;
}

export const authService = {
  async register(data: Record<string, unknown>): Promise<AuthResult> {
    const email = String(data.email).toLowerCase().trim();

    const existing = await userRepository.findByEmail(email);
    if (existing) {
      throw ApiError.conflict('Email already registered');
    }

    const user = await authRepository.create({
      ...data,
      email,
    });

    const tokens = await tokenService.generateTokenPair(
      String((user as Record<string, unknown>)._id),
      email,
      String(user.role)
    );

    return {
      user: sanitizeAuthUser(user),
      tokens,
    };
  },

  async login(email: string, password: string): Promise<AuthResult> {
    const user = await authRepository.findByEmail(email);

    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password as string);

    if (!isPasswordValid) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    await authRepository.updateLastLogin(String((user as Record<string, unknown>)._id));

    const tokens = await tokenService.generateTokenPair(
      String((user as Record<string, unknown>)._id),
      String(user.email),
      String(user.role)
    );

    return {
      user: sanitizeAuthUser(user),
      tokens,
    };
  },

  async logout(accessToken: string, refreshToken?: string): Promise<void> {
    await tokenService.blacklistAccessToken(accessToken);

    if (refreshToken) {
      try {
        const payload = tokenService.decodeToken(refreshToken);
        if (payload?.jti) {
          await tokenService.revokeRefreshToken(payload.jti);
        }
      } catch {
        // Ignore invalid refresh token during logout
      }
    }
  },

  async refresh(refreshToken: string): Promise<TokenPair> {
    return tokenService.rotateRefreshToken(refreshToken);
  },

  async me(userId: string): Promise<SanitizedUser | null> {
    const user = await userRepository.findById(userId);
    if (!user) return null;
    return sanitizeAuthUser(user);
  },

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = await authRepository.findByEmail(
      String((await userRepository.findById(userId))?.email ?? '')
    );

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password as string);

    if (!isOldPasswordValid) {
      throw ApiError.badRequest('Current password is incorrect');
    }

    await authRepository.updateById(userId, { password: newPassword });
  },
};
