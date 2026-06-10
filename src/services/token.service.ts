import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { ApiError } from '../utils/ApiError';
import { redisService } from './redis.service';

export interface TokenPayload {
  sub: string;
  email: string;
  role: string;
  jti: string;
  type: 'access' | 'refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
}

const ACCESS_SECRET = env.JWT_SECRET;
const REFRESH_SECRET = env.JWT_REFRESH_SECRET;
const ACCESS_EXPIRES = env.JWT_ACCESS_EXPIRES_IN;
const REFRESH_EXPIRES = env.JWT_REFRESH_EXPIRES_IN;

const BLACKLIST_PREFIX = 'token:blacklist:';
const REFRESH_PREFIX = 'token:refresh:';

const toSeconds = (duration: string): number => {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return 900; // default 15 min

  const [, value, unit] = match;
  const multiplier: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
  };
  return parseInt(value, 10) * (multiplier[unit] ?? 60);
};

export const tokenService = {
  /** Generate a signed access token. */
  generateAccessToken(userId: string, email: string, role: string): string {
    const payload: Omit<TokenPayload, 'type'> = {
      sub: userId,
      email,
      role,
      jti: randomUUID(),
    };

    return jwt.sign({ ...payload, type: 'access' }, ACCESS_SECRET, {
      expiresIn: ACCESS_EXPIRES as `${number}${'s' | 'm' | 'h' | 'd' | 'w' | 'y'}`,
    });
  },

  /** Generate a signed refresh token and store its jti in Redis. */
  async generateRefreshToken(userId: string, email: string, role: string): Promise<string> {
    const jti = randomUUID();
    const payload: TokenPayload = {
      sub: userId,
      email,
      role,
      jti,
      type: 'refresh',
    };

    const token = jwt.sign(payload, REFRESH_SECRET, {
      expiresIn: REFRESH_EXPIRES as `${number}${'s' | 'm' | 'h' | 'd' | 'w' | 'y'}`,
    });

    const ttl = toSeconds(REFRESH_EXPIRES);
    await redisService.set(`${REFRESH_PREFIX}${jti}`, userId, ttl);

    return token;
  },

  /** Generate both tokens as a pair. */
  async generateTokenPair(userId: string, email: string, role: string): Promise<TokenPair> {
    const accessToken = this.generateAccessToken(userId, email, role);
    const refreshToken = await this.generateRefreshToken(userId, email, role);

    const accessDecoded = jwt.decode(accessToken) as { exp: number } | null;
    const refreshDecoded = jwt.decode(refreshToken) as { exp: number } | null;

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresAt: new Date((accessDecoded?.exp ?? 0) * 1000),
      refreshTokenExpiresAt: new Date((refreshDecoded?.exp ?? 0) * 1000),
    };
  },

  /** Verify an access token and return its payload. */
  verifyAccessToken(token: string): TokenPayload {
    try {
      const payload = jwt.verify(token, ACCESS_SECRET, {
        clockTolerance: 30,
      }) as TokenPayload;

      if (payload.type !== 'access') {
        throw ApiError.unauthorized('Invalid token type');
      }

      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw ApiError.unauthorized('Access token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw ApiError.unauthorized('Invalid access token');
      }
      throw ApiError.unauthorized('Token verification failed');
    }
  },

  /** Verify a refresh token, check Redis storage, and return its payload. */
  async verifyRefreshToken(token: string): Promise<TokenPayload> {
    let payload: TokenPayload;

    try {
      payload = jwt.verify(token, REFRESH_SECRET, {
        clockTolerance: 30,
      }) as TokenPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw ApiError.unauthorized('Refresh token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw ApiError.unauthorized('Invalid refresh token');
      }
      throw ApiError.unauthorized('Token verification failed');
    }

    if (payload.type !== 'refresh') {
      throw ApiError.unauthorized('Invalid token type');
    }

    const stored = await redisService.get(`${REFRESH_PREFIX}${payload.jti}`);
    if (!stored) {
      throw ApiError.unauthorized('Refresh token revoked or expired');
    }

    return payload;
  },

  /** Decode a token without verifying (for inspection). */
  decodeToken(token: string): TokenPayload | null {
    try {
      return jwt.decode(token) as TokenPayload | null;
    } catch {
      return null;
    }
  },

  /** Blacklist an access token (logout / force expire). */
  async blacklistAccessToken(token: string): Promise<void> {
    const payload = this.decodeToken(token);
    if (!payload?.jti || payload.type !== 'access') return;

    const decoded = jwt.decode(token) as { exp?: number } | null;
    const ttl = decoded?.exp
      ? Math.max(0, decoded.exp - Math.floor(Date.now() / 1000))
      : toSeconds(ACCESS_EXPIRES);

    await redisService.set(`${BLACKLIST_PREFIX}${payload.jti}`, '1', ttl);
    logger.info('Access token blacklisted', { jti: payload.jti });
  },

  /** Check if an access token is blacklisted. */
  async isBlacklisted(token: string): Promise<boolean> {
    const payload = this.decodeToken(token);
    if (!payload?.jti) return false;

    const blacklisted = await redisService.get(`${BLACKLIST_PREFIX}${payload.jti}`);
    return blacklisted === '1';
  },

  /** Revoke a refresh token by its jti. */
  async revokeRefreshToken(jti: string): Promise<void> {
    await redisService.del(`${REFRESH_PREFIX}${jti}`);
    logger.info('Refresh token revoked', { jti });
  },

  /** Revoke all refresh tokens for a user (change password / security breach). */
  async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    // Note: In a full implementation, maintain a user-specific refresh token index in Redis.
    // This stub logs the intent; extend with a Redis set per user when scaling.
    logger.warn('Revoke all refresh tokens for user', { userId });
  },

  /** Rotate refresh token: verify old, revoke it, issue new pair. */
  async rotateRefreshToken(refreshToken: string): Promise<TokenPair> {
    const payload = await this.verifyRefreshToken(refreshToken);

    await this.revokeRefreshToken(payload.jti);

    return this.generateTokenPair(payload.sub, payload.email, payload.role);
  },
};
