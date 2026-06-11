"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.teamController = void 0;
const http_status_codes_1 = require("http-status-codes");
const team_service_1 = require("./team.service");
const ApiResponse_1 = require("../../utils/ApiResponse");
const rbac_1 = require("../../utils/rbac");
exports.teamController = {
    async list(req, res) {
        const query = req.query;
        // Non-admins only see teams they own or are members of
        if (!(0, rbac_1.isAdmin)(req.user.role)) {
            query.memberId = req.user.id;
        }
        const { data, meta } = await team_service_1.teamService.list(query);
        ApiResponse_1.ApiResponse.paginated(data, meta).send(res);
    },
    async getById(req, res) {
        const team = await team_service_1.teamService.getById(req.params.id);
        if (!team) {
            res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Team not found',
            });
            return;
        }
        ApiResponse_1.ApiResponse.ok(team).send(res);
    },
    async create(req, res) {
        const body = { ...req.body, ownerId: req.user.id };
        const team = await team_service_1.teamService.create(body);
        ApiResponse_1.ApiResponse.created(team).send(res);
    },
    async update(req, res) {
        const team = await team_service_1.teamService.update(req.params.id, req.body, req.user.id, req.user.role);
        if (!team) {
            res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Team not found',
            });
            return;
        }
        ApiResponse_1.ApiResponse.ok(team).send(res);
    },
    async remove(req, res) {
        const deleted = await team_service_1.teamService.remove(req.params.id, req.user.id, req.user.role);
        if (!deleted) {
            res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Team not found',
            });
            return;
        }
        ApiResponse_1.ApiResponse.noContent().send(res);
    },
    async addMember(req, res) {
        const team = await team_service_1.teamService.addMember(req.params.id, req.body.userId, req.body.role, req.user.id, req.user.role);
        if (!team) {
            res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Team not found or member already exists',
            });
            return;
        }
        ApiResponse_1.ApiResponse.ok(team).send(res);
    },
    async removeMember(req, res) {
        const team = await team_service_1.teamService.removeMember(req.params.id, req.body.userId, req.user.id, req.user.role);
        if (!team) {
            res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Team not found',
            });
            return;
        }
        ApiResponse_1.ApiResponse.ok(team).send(res);
    },
};
//# sourceMappingURL=team.controller.js.map