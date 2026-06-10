"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCrudModule = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const http_status_codes_1 = require("http-status-codes");
const asyncHandler_1 = require("../../utils/asyncHandler");
const ApiResponse_1 = require("../../utils/ApiResponse");
const pagination_1 = require("../../utils/pagination");
const validate_middleware_1 = require("../../middleware/validate.middleware");
const logger_1 = require("../../config/logger");
/* ------------------------------------------------------------------ */
// Defaults
/* ------------------------------------------------------------------ */
const defaultListQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.coerce.number().min(1).default(1),
        limit: zod_1.z.coerce.number().min(1).max(100).default(10),
        sort: zod_1.z.string().optional().default("createdAt"),
        order: zod_1.z.enum(["asc", "desc"]).optional().default("desc"),
        search: zod_1.z.string().optional()
    })
});
const defaultIdParamSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().min(1, "Id is required")
    })
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
const createCrudModule = (options) => {
    const { name, model, validation = {}, searchFields = [], buildFilter } = options;
    /* ---------------------------------------------------------------- */
    // Repository
    /* ---------------------------------------------------------------- */
    const repository = {
        /**
         * Find all documents with pagination, sorting, and optional filtering.
         */
        async findAll(opts, filter = {}) {
            const skip = (opts.page - 1) * opts.limit;
            const sortDirection = opts.order === "desc" ? -1 : 1;
            const [data, total] = await Promise.all([
                model
                    .find(filter)
                    .sort({ [opts.sort]: sortDirection })
                    .skip(skip)
                    .limit(opts.limit)
                    .lean(),
                model.countDocuments(filter)
            ]);
            logger_1.logger.debug(`${name} repository.findAll`, { filter, count: data.length, total });
            return {
                data: data,
                meta: (0, pagination_1.buildPaginationMeta)(opts.page, opts.limit, total)
            };
        },
        /**
         * Find a single document by its MongoDB _id.
         */
        async findById(id) {
            return model.findById(id).lean();
        },
        /**
         * Create a new document.
         */
        async create(data) {
            logger_1.logger.info(`${name} repository.create`, { data });
            return model.create(data);
        },
        /**
         * Update a document by id. Returns the updated document or null.
         */
        async updateById(id, data) {
            logger_1.logger.info(`${name} repository.updateById`, { id, data });
            return model.findByIdAndUpdate(id, data, { new: true }).lean();
        },
        /**
         * Delete a document by id. Returns true if a document was removed.
         */
        async deleteById(id) {
            logger_1.logger.info(`${name} repository.deleteById`, { id });
            const result = await model.findByIdAndDelete(id);
            return result !== null;
        }
    };
    /* ---------------------------------------------------------------- */
    // Service
    /* ---------------------------------------------------------------- */
    const service = {
        async list(query) {
            const pagination = (0, pagination_1.getPagination)(query.page, query.limit, query.sort, query.order);
            let filter = {};
            if (buildFilter) {
                filter = buildFilter(query);
            }
            else if (searchFields.length > 0 && query.search) {
                const searchRegex = { $regex: String(query.search), $options: "i" };
                filter.$or = searchFields.map((field) => ({
                    [field]: searchRegex
                }));
            }
            return repository.findAll({
                page: pagination.page,
                limit: pagination.limit,
                sort: pagination.sort,
                order: pagination.order
            }, filter);
        },
        async getById(id) {
            return repository.findById(id);
        },
        async create(data) {
            return repository.create(data);
        },
        async update(id, data) {
            return repository.updateById(id, data);
        },
        async remove(id) {
            return repository.deleteById(id);
        }
    };
    /* ---------------------------------------------------------------- */
    // Controller
    /* ---------------------------------------------------------------- */
    const controller = {
        async list(req, res) {
            const { data, meta } = await service.list(req.query);
            ApiResponse_1.ApiResponse.paginated(data, meta).send(res);
        },
        async getById(req, res) {
            const item = await service.getById(req.params.id);
            if (!item) {
                res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                    success: false,
                    message: `${name} not found`
                });
                return;
            }
            ApiResponse_1.ApiResponse.ok(item).send(res);
        },
        async create(req, res) {
            const item = await service.create(req.body);
            ApiResponse_1.ApiResponse.created(item, `${name} created`).send(res);
        },
        async update(req, res) {
            const item = await service.update(req.params.id, req.body);
            if (!item) {
                res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                    success: false,
                    message: `${name} not found`
                });
                return;
            }
            ApiResponse_1.ApiResponse.ok(item, `${name} updated`).send(res);
        },
        async remove(req, res) {
            const deleted = await service.remove(req.params.id);
            if (!deleted) {
                res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                    success: false,
                    message: `${name} not found`
                });
                return;
            }
            ApiResponse_1.ApiResponse.noContent(`${name} deleted`).send(res);
        }
    };
    /* ---------------------------------------------------------------- */
    // Router
    /* ---------------------------------------------------------------- */
    const router = (0, express_1.Router)();
    const listQueryValidator = validation.listQuery
        ? (0, validate_middleware_1.validateMiddleware)(validation.listQuery)
        : (0, validate_middleware_1.validateMiddleware)(defaultListQuerySchema);
    const idParamValidator = validation.idParam
        ? (0, validate_middleware_1.validateMiddleware)(validation.idParam)
        : (0, validate_middleware_1.validateMiddleware)(defaultIdParamSchema);
    const createValidator = validation.create
        ? (0, validate_middleware_1.validateMiddleware)(validation.create)
        : (_req, _res, next) => next();
    const updateValidator = validation.update
        ? (0, validate_middleware_1.validateMiddleware)(validation.update)
        : (_req, _res, next) => next();
    router.get("/", listQueryValidator, (0, asyncHandler_1.asyncHandler)(controller.list));
    router.get("/:id", idParamValidator, (0, asyncHandler_1.asyncHandler)(controller.getById));
    router.post("/", createValidator, (0, asyncHandler_1.asyncHandler)(controller.create));
    router.patch("/:id", updateValidator, (0, asyncHandler_1.asyncHandler)(controller.update));
    router.delete("/:id", idParamValidator, (0, asyncHandler_1.asyncHandler)(controller.remove));
    return {
        repository,
        service,
        controller,
        router
    };
};
exports.createCrudModule = createCrudModule;
