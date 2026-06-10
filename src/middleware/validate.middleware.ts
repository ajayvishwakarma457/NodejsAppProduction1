import { NextFunction, Request, Response } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { StatusCodes } from 'http-status-codes';
import { ApiError } from '../utils/ApiError';
import { logger } from '../config/logger';

/* ------------------------------------------------------------------ */
// Types
/* ------------------------------------------------------------------ */

export type ValidationErrorDetails = Record<string, string[]>;

export interface ValidateSchemas {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
}

/* ------------------------------------------------------------------ */
// Helpers
/* ------------------------------------------------------------------ */

/**
 * Formats a ZodError into a human-readable message and a structured
 * details map keyed by dot-notation paths (e.g. "body.email").
 */
const formatZodErrors = (error: ZodError): { message: string; details: ValidationErrorDetails } => {
  const details: ValidationErrorDetails = {};

  for (const issue of error.issues) {
    const path = issue.path.join('.') || 'root';
    if (!details[path]) {
      details[path] = [];
    }
    details[path].push(issue.message);
  }

  const message = Object.entries(details)
    .map(([path, msgs]) => `${path}: ${msgs.join(', ')}`)
    .join('; ');

  return {
    message: message || 'Validation failed',
    details,
  };
};

/* ------------------------------------------------------------------ */
// Middleware
/* ------------------------------------------------------------------ */

/**
 * Legacy-compatible middleware that validates the entire request object
 * (body, params, query) against a single combined Zod schema.
 *
 * @example
 * validateMiddleware(z.object({
 *   body: z.object({ email: z.string().email() }),
 *   params: z.object({ id: z.string().uuid() }),
 *   query: z.object({ page: z.string().optional() })
 * }))
 */
export const validateMiddleware = <T extends ZodSchema>(schema: T) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!result.success) {
      const { message, details } = formatZodErrors(result.error);

      logger.warn('Request validation failed', {
        path: req.path,
        method: req.method,
        requestId: req.requestId,
        details,
      });

      next(new ApiError(StatusCodes.BAD_REQUEST, message, details));
      return;
    }

    // Overwrite request properties with parsed (and potentially
    // transformed/coerced) values so downstream handlers see clean data.
    const parsed = result.data as Record<string, unknown>;
    if (parsed.body !== undefined) req.body = parsed.body;
    if (parsed.params !== undefined) req.params = parsed.params as Record<string, string>;
    if (parsed.query !== undefined) req.query = parsed.query as Request['query'];

    next();
  };
};

/**
 * Flexible validation middleware that validates specific request parts
 * independently. This is the preferred approach for new code because it
 * provides clearer error messages and better TypeScript inference.
 *
 * @example
 * validate({
 *   body: z.object({ email: z.string().email() }),
 *   params: z.object({ id: z.string().uuid() })
 * })
 */
export const validate = (schemas: ValidateSchemas) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const allErrors: ValidationErrorDetails = {};
    const errorMessages: string[] = [];

    const parts = ['body', 'params', 'query'] as const;

    for (const part of parts) {
      const schema = schemas[part];
      if (!schema) continue;

      const result = schema.safeParse(req[part]);

      if (!result.success) {
        const { message, details } = formatZodErrors(result.error);

        for (const [path, msgs] of Object.entries(details)) {
          allErrors[`${part}.${path}`] = msgs;
        }

        errorMessages.push(`${part} - ${message}`);
      } else {
        // Cast is safe: Zod has validated the shape and Express types
        // are intentionally loose (body: any, query: ParsedQs, etc.).
        req[part] = result.data as unknown as (typeof req)[typeof part];
      }
    }

    if (errorMessages.length > 0) {
      logger.warn('Request validation failed', {
        path: req.path,
        method: req.method,
        requestId: req.requestId,
        details: allErrors,
      });

      next(new ApiError(StatusCodes.BAD_REQUEST, errorMessages.join('; '), allErrors));
      return;
    }

    next();
  };
};
