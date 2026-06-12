import { Request, Response, Router } from 'express';
import { Model, Document, FilterQuery } from 'mongoose';
import { ZodSchema, z } from 'zod';
import { StatusCodes } from 'http-status-codes';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiResponse } from '../../utils/ApiResponse';
import { getPagination, buildPaginationMeta, PaginationMeta } from '../../utils/pagination';
import { timedQuery, buildListProjection, buildRegexSearchFilter } from '../../utils/query-optimizer';
import { validateMiddleware } from '../../middleware/validate.middleware';
import { logger } from '../../config/logger';

/* ------------------------------------------------------------------ */
// Types
/* ------------------------------------------------------------------ */

export interface CrudListOptions {
  page: number;
  limit: number;
  sort: string;
  order: 'asc' | 'desc';
}

export interface CrudListResult<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface CrudValidationSchemas {
  /** Validates the request body for create operations. */
  create?: ZodSchema;
  /** Validates the request body for update operations. */
  update?: ZodSchema;
  /** Validates query parameters for list operations. */
  listQuery?: ZodSchema;
  /** Validates route parameters (e.g. `/:id`). */
  idParam?: ZodSchema;
}

export interface CrudModuleOptions<TDoc extends Document> {
  /** Human-readable entity name used in logs and error messages. */
  name: string;
  /** Mongoose model for the entity. */
  model: Model<TDoc>;
  /** Optional Zod validation schemas. Falls back to sensible defaults. */
  validation?: CrudValidationSchemas;
  /** Fields to include in full-text search via `?search=term`. */
  searchFields?: string[];
  /**
   * Custom filter builder. Receives the raw query object and should return
   * a Mongoose filter. When provided, `searchFields` is ignored.
   */
  buildFilter?: (query: Record<string, unknown>) => FilterQuery<TDoc>;
}

/* ------------------------------------------------------------------ */
// Defaults
/* ------------------------------------------------------------------ */

const defaultListQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(10),
    sort: z.string().optional().default('createdAt'),
    order: z.enum(['asc', 'desc']).optional().default('desc'),
    search: z.string().optional(),
  }),
});

const defaultIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Id is required'),
  }),
});

/* ------------------------------------------------------------------ */
// Factory
/* ------------------------------------------------------------------ */

/**
 * Creates a production-ready CRUD module (repository + service +
 * controller + router) for a given Mongoose model.
 *
 * @example
 * ```ts
 * const userModule = createCrudModule({
 *   name: "User",
 *   model: UserModel,
 *   searchFields: ["firstName", "lastName", "email"],
 *   validation: {
 *     create: createUserSchema,
 *     update: updateUserSchema
 *   }
 * });
 *
 * app.use("/users", userModule.router);
 * ```
 */
export const createCrudModule = <TDoc extends Document>(options: CrudModuleOptions<TDoc>) => {
  const { name, model, validation = {}, searchFields = [], buildFilter } = options;

  /* ---------------------------------------------------------------- */
  // Repository
  /* ---------------------------------------------------------------- */

  const repository = {
    /**
     * Find all documents with pagination, sorting, and optional filtering.
     */
    async findAll(
      opts: CrudListOptions,
      filter: FilterQuery<TDoc> = {}
    ): Promise<CrudListResult<TDoc>> {
      const skip = (opts.page - 1) * opts.limit;
      const sortDirection = opts.order === 'desc' ? -1 : 1;

      const listQuery = model
        .find(filter)
        .sort({ [opts.sort]: sortDirection })
        .skip(skip)
        .limit(opts.limit)
        .select(buildListProjection())
        .lean();

      const [data, total] = await Promise.all([
        timedQuery(listQuery, { collection: name, operation: 'findAll' }),
        model.countDocuments(filter),
      ]);

      return {
        data: data as TDoc[],
        meta: buildPaginationMeta(opts.page, opts.limit, total),
      };
    },

    /**
     * Find a single document by its MongoDB _id.
     */
    async findById(id: string): Promise<TDoc | null> {
      return model.findById(id).lean() as Promise<TDoc | null>;
    },

    /**
     * Create a new document.
     */
    async create(data: Record<string, unknown>): Promise<TDoc> {
      logger.info(`${name} repository.create`, { data });
      return model.create(data) as Promise<TDoc>;
    },

    /**
     * Update a document by id. Returns the updated document or null.
     */
    async updateById(id: string, data: Record<string, unknown>): Promise<TDoc | null> {
      logger.info(`${name} repository.updateById`, { id, data });
      return model.findByIdAndUpdate(id, data, { new: true }).lean() as Promise<TDoc | null>;
    },

    /**
     * Delete a document by id. Returns true if a document was removed.
     */
    async deleteById(id: string): Promise<boolean> {
      logger.info(`${name} repository.deleteById`, { id });
      const result = await model.findByIdAndDelete(id);
      return result !== null;
    },
  };

  /* ---------------------------------------------------------------- */
  // Service
  /* ---------------------------------------------------------------- */

  const service = {
    async list(query: Record<string, unknown>): Promise<CrudListResult<TDoc>> {
      const pagination = getPagination(query.page, query.limit, query.sort, query.order);

      let filter: FilterQuery<TDoc> = {};

      if (buildFilter) {
        filter = buildFilter(query);
      } else if (searchFields.length > 0 && query.search) {
        filter = buildRegexSearchFilter(String(query.search), searchFields) as FilterQuery<TDoc>;
      }

      return repository.findAll(
        {
          page: pagination.page,
          limit: pagination.limit,
          sort: pagination.sort,
          order: pagination.order as 'asc' | 'desc',
        },
        filter
      );
    },

    async getById(id: string): Promise<TDoc | null> {
      return repository.findById(id);
    },

    async create(data: Record<string, unknown>): Promise<TDoc> {
      return repository.create(data);
    },

    async update(id: string, data: Record<string, unknown>): Promise<TDoc | null> {
      return repository.updateById(id, data);
    },

    async remove(id: string): Promise<boolean> {
      return repository.deleteById(id);
    },
  };

  /* ---------------------------------------------------------------- */
  // Controller
  /* ---------------------------------------------------------------- */

  const controller = {
    async list(req: Request, res: Response) {
      const { data, meta } = await service.list(req.query as Record<string, unknown>);
      ApiResponse.paginated(data, meta).send(res);
    },

    async getById(req: Request, res: Response) {
      const item = await service.getById(req.params.id as string);

      if (!item) {
        res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: `${name} not found`,
        });
        return;
      }

      ApiResponse.ok(item).send(res);
    },

    async create(req: Request, res: Response) {
      const item = await service.create(req.body);
      ApiResponse.created(item, `${name} created`).send(res);
    },

    async update(req: Request, res: Response) {
      const item = await service.update(req.params.id as string, req.body);

      if (!item) {
        res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: `${name} not found`,
        });
        return;
      }

      ApiResponse.ok(item, `${name} updated`).send(res);
    },

    async remove(req: Request, res: Response) {
      const deleted = await service.remove(req.params.id as string);

      if (!deleted) {
        res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: `${name} not found`,
        });
        return;
      }

      ApiResponse.noContent(`${name} deleted`).send(res);
    },
  };

  /* ---------------------------------------------------------------- */
  // Router
  /* ---------------------------------------------------------------- */

  const router = Router();

  const listQueryValidator = validation.listQuery
    ? validateMiddleware(validation.listQuery)
    : validateMiddleware(defaultListQuerySchema);

  const idParamValidator = validation.idParam
    ? validateMiddleware(validation.idParam)
    : validateMiddleware(defaultIdParamSchema);

  const createValidator = validation.create
    ? validateMiddleware(validation.create)
    : (_req: Request, _res: Response, next: () => void) => next();

  const updateValidator = validation.update
    ? validateMiddleware(validation.update)
    : (_req: Request, _res: Response, next: () => void) => next();

  router.get('/', listQueryValidator, asyncHandler(controller.list));
  router.get('/:id', idParamValidator, asyncHandler(controller.getById));
  router.post('/', createValidator, asyncHandler(controller.create));
  router.patch('/:id', updateValidator, asyncHandler(controller.update));
  router.delete('/:id', idParamValidator, asyncHandler(controller.remove));

  return {
    repository,
    service,
    controller,
    router,
  };
};
