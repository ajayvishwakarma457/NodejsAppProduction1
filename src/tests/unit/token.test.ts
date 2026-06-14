import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { tokenService } from '../../services/token.service';
import { redisService } from '../../services/redis.service';
import { ApiError } from '../../utils/ApiError';

describe('tokenService', () => {
  beforeAll(async () => {
    await redisService.connect();
  });

  afterAll(async () => {
    await redisService.disconnect();
  });

  it('should generate a valid access token', () => {
    const token = tokenService.generateAccessToken('user-1', 'a@example.com', 'admin');
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });

  it('should verify a valid access token', () => {
    const token = tokenService.generateAccessToken('user-1', 'a@example.com', 'admin');
    const payload = tokenService.verifyAccessToken(token);
    expect(payload.sub).toBe('user-1');
    expect(payload.email).toBe('a@example.com');
    expect(payload.role).toBe('admin');
    expect(payload.type).toBe('access');
    expect(payload.jti).toBeDefined();
  });

  it('should reject an invalid access token', () => {
    expect(() => tokenService.verifyAccessToken('bad-token')).toThrow(ApiError);
  });

  it('should generate and verify a refresh token', async () => {
    const token = await tokenService.generateRefreshToken('user-1', 'a@example.com', 'admin');
    const payload = await tokenService.verifyRefreshToken(token);
    expect(payload.sub).toBe('user-1');
    expect(payload.type).toBe('refresh');
  });

  it('should reject a revoked refresh token', async () => {
    const token = await tokenService.generateRefreshToken('user-1', 'a@example.com', 'admin');
    const payload = await tokenService.verifyRefreshToken(token);

    await tokenService.revokeRefreshToken(payload.jti);

    await expect(tokenService.verifyRefreshToken(token)).rejects.toThrow(ApiError);
  });

  it('should generate a token pair', async () => {
    const pair = await tokenService.generateTokenPair('user-1', 'a@example.com', 'member');
    expect(pair.accessToken).toBeDefined();
    expect(pair.refreshToken).toBeDefined();
    expect(pair.accessTokenExpiresAt instanceof Date).toBe(true);
    expect(pair.refreshTokenExpiresAt instanceof Date).toBe(true);
  });

  it('should blacklist an access token', async () => {
    const token = tokenService.generateAccessToken('user-1', 'a@example.com', 'admin');
    expect(await tokenService.isBlacklisted(token)).toBe(false);

    await tokenService.blacklistAccessToken(token);
    expect(await tokenService.isBlacklisted(token)).toBe(true);
  });

  it('should rotate refresh tokens', async () => {
    const pair = await tokenService.generateTokenPair('user-1', 'a@example.com', 'member');
    const newPair = await tokenService.rotateRefreshToken(pair.refreshToken);

    expect(newPair.accessToken).toBeDefined();
    expect(newPair.refreshToken).toBeDefined();

    // Old refresh token should be revoked
    await expect(tokenService.verifyRefreshToken(pair.refreshToken)).rejects.toThrow(ApiError);
  });

  it('should decode a token without verifying', () => {
    const token = tokenService.generateAccessToken('user-1', 'a@example.com', 'admin');
    const decoded = tokenService.decodeToken(token);
    expect(decoded?.sub).toBe('user-1');
    expect(decoded?.type).toBe('access');
  });
});
