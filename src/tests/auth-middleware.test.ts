import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Request, Response, NextFunction } from "express";
import { authMiddleware, optionalAuthMiddleware } from "../middleware/auth.middleware";
import { tokenService } from "../services/token.service";
import { redisService } from "../services/redis.service";
import { ApiError } from "../utils/ApiError";

const mockRequest = (headers: Record<string, string> = {}): Partial<Request> => ({
  headers,
  user: undefined
});

const mockResponse = (): Partial<Response> => ({
  status: () => mockResponse() as Response,
  json: () => mockResponse() as Response
});

const mockNext = (): NextFunction => {
  const calls: unknown[] = [];
  const fn: NextFunction = (arg?: unknown) => {
    calls.push(arg);
  };
  (fn as any).calls = calls;
  return fn;
};

describe("authMiddleware", () => {
  beforeAll(async () => {
    await redisService.connect();
  });

  afterAll(async () => {
    await redisService.disconnect();
  });

  it("should reject request without Authorization header", async () => {
    const req = mockRequest() as Request;
    const res = mockResponse() as Response;
    const next = mockNext();

    await authMiddleware(req, res, next);

    expect((next as any).calls[0]).toBeInstanceOf(ApiError);
    expect((next as any).calls[0].statusCode).toBe(401);
  });

  it("should reject request with malformed Authorization header", async () => {
    const req = mockRequest({ authorization: "Basic abc123" }) as Request;
    const res = mockResponse() as Response;
    const next = mockNext();

    await authMiddleware(req, res, next);

    expect((next as any).calls[0]).toBeInstanceOf(ApiError);
    expect((next as any).calls[0].statusCode).toBe(401);
  });

  it("should reject invalid token", async () => {
    const req = mockRequest({ authorization: "Bearer invalid-token" }) as Request;
    const res = mockResponse() as Response;
    const next = mockNext();

    await authMiddleware(req, res, next);

    expect((next as any).calls[0]).toBeInstanceOf(ApiError);
    expect((next as any).calls[0].statusCode).toBe(401);
  });

  it("should reject blacklisted token", async () => {
    const token = tokenService.generateAccessToken("user-1", "a@example.com", "member");
    await tokenService.blacklistAccessToken(token);

    const req = mockRequest({ authorization: `Bearer ${token}` }) as Request;
    const res = mockResponse() as Response;
    const next = mockNext();

    await authMiddleware(req, res, next);

    expect((next as any).calls[0]).toBeInstanceOf(ApiError);
    expect((next as any).calls[0].message).toContain("revoked");
  });

  it("should allow valid token and attach user", async () => {
    const token = tokenService.generateAccessToken("user-1", "a@example.com", "admin");

    const req = mockRequest({ authorization: `Bearer ${token}` }) as Request;
    const res = mockResponse() as Response;
    const next = mockNext();

    await authMiddleware(req, res, next);

    expect((next as any).calls[0]).toBeUndefined();
    expect(req.user).toEqual({
      id: "user-1",
      email: "a@example.com",
      role: "admin"
    });
  });
});

describe("optionalAuthMiddleware", () => {
  beforeAll(async () => {
    await redisService.connect();
  });

  afterAll(async () => {
    await redisService.disconnect();
  });

  it("should continue without user when no token provided", async () => {
    const req = mockRequest() as Request;
    const res = mockResponse() as Response;
    const next = mockNext();

    await optionalAuthMiddleware(req, res, next);

    expect((next as any).calls[0]).toBeUndefined();
    expect(req.user).toBeUndefined();
  });

  it("should continue without user when token is invalid", async () => {
    const req = mockRequest({ authorization: "Bearer bad-token" }) as Request;
    const res = mockResponse() as Response;
    const next = mockNext();

    await optionalAuthMiddleware(req, res, next);

    expect((next as any).calls[0]).toBeUndefined();
    expect(req.user).toBeUndefined();
  });

  it("should attach user when valid token provided", async () => {
    const token = tokenService.generateAccessToken("user-2", "b@example.com", "member");

    const req = mockRequest({ authorization: `Bearer ${token}` }) as Request;
    const res = mockResponse() as Response;
    const next = mockNext();

    await optionalAuthMiddleware(req, res, next);

    expect((next as any).calls[0]).toBeUndefined();
    expect(req.user).toEqual({
      id: "user-2",
      email: "b@example.com",
      role: "member"
    });
  });
});
