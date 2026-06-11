"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.revokeApiKeySchema = exports.createApiKeySchema = void 0;
const zod_1 = require("zod");
const api_key_model_1 = require("./api-key.model");
/* ------------------------------------------------------------------ */
// Body schemas
/* ------------------------------------------------------------------ */
exports.createApiKeySchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, 'API key name is required').max(100),
        scopes: zod_1.z.array(zod_1.z.enum(api_key_model_1.API_KEY_SCOPES)).min(1, 'At least one scope is required').optional(),
        expiresInDays: zod_1.z.coerce.number().min(1).max(365).optional(),
    }),
});
/* ------------------------------------------------------------------ */
// Parameter schemas
/* ------------------------------------------------------------------ */
exports.revokeApiKeySchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().min(1, 'API key ID is required'),
    }),
});
//# sourceMappingURL=api-key.validation.js.map