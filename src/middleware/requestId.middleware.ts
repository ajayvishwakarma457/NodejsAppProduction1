import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';

const MAX_REQUEST_ID_LENGTH = 255;
const VALID_REQUEST_ID_PATTERN = /^[a-zA-Z0-9._:-]+$/;

const sanitizeRequestId = (raw: string | undefined): string => {
  if (!raw) return randomUUID();

  const trimmed = raw.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_REQUEST_ID_LENGTH) {
    return randomUUID();
  }

  // Take only the first value if multiple headers were sent (comma-separated)
  const firstValue = trimmed.split(',')[0].trim();
  if (!VALID_REQUEST_ID_PATTERN.test(firstValue)) {
    return randomUUID();
  }

  return firstValue;
};

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const requestId = sanitizeRequestId(req.get('X-Request-Id'));
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
};
