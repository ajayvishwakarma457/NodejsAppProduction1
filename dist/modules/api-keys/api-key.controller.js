"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiKeyController = void 0;
const http_status_codes_1 = require("http-status-codes");
const api_key_service_1 = require("./api-key.service");
const ApiResponse_1 = require("../../utils/ApiResponse");
exports.apiKeyController = {
    async create(req, res) {
        const userId = req.user.id;
        const { name, scopes, expiresInDays } = req.body;
        const result = await api_key_service_1.apiKeyService.generateApiKey(userId, {
            name,
            role: req.user.role ?? 'member',
            scopes,
            expiresInDays,
        });
        ApiResponse_1.ApiResponse.created({
            apiKey: result.apiKey,
            metadata: result.metadata,
        }, 'API key created successfully').send(res);
    },
    async list(req, res) {
        const keys = await api_key_service_1.apiKeyService.listApiKeys(req.user.id);
        ApiResponse_1.ApiResponse.ok(keys, 'API keys retrieved successfully').send(res);
    },
    async revoke(req, res) {
        const userId = req.user.id;
        const { id } = req.params;
        await api_key_service_1.apiKeyService.revokeApiKey(userId, id);
        res.status(http_status_codes_1.StatusCodes.NO_CONTENT).send();
    },
};
//# sourceMappingURL=api-key.controller.js.map