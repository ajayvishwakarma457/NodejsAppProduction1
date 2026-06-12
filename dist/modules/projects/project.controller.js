"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectController = void 0;
const http_status_codes_1 = require("http-status-codes");
const project_service_1 = require("./project.service");
const ApiResponse_1 = require("../../utils/ApiResponse");
const rbac_1 = require("../../utils/rbac");
exports.projectController = {
    async dashboard(req, res) {
        const data = await project_service_1.projectService.getDashboard(req.user.id, req.user.role);
        ApiResponse_1.ApiResponse.ok(data).send(res);
    },
    async list(req, res) {
        const query = req.query;
        // Non-admins only see their own projects by default
        if (!(0, rbac_1.isAdmin)(req.user.role)) {
            query.ownerId = req.user.id;
        }
        const { data, meta } = await project_service_1.projectService.list(query);
        ApiResponse_1.ApiResponse.paginated(data, meta).send(res);
    },
    async getById(req, res) {
        const project = await project_service_1.projectService.getById(req.params.id);
        if (!project) {
            res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Project not found',
            });
            return;
        }
        ApiResponse_1.ApiResponse.ok(project).send(res);
    },
    async create(req, res) {
        const body = { ...req.body, ownerId: req.user.id };
        const project = await project_service_1.projectService.create(body);
        ApiResponse_1.ApiResponse.created(project, 'Project created').send(res);
    },
    async update(req, res) {
        const project = await project_service_1.projectService.update(req.params.id, req.body, req.user.id, req.user.role);
        if (!project) {
            res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Project not found',
            });
            return;
        }
        ApiResponse_1.ApiResponse.ok(project, 'Project updated').send(res);
    },
    async remove(req, res) {
        const deleted = await project_service_1.projectService.remove(req.params.id, req.user.id, req.user.role);
        if (!deleted) {
            res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Project not found',
            });
            return;
        }
        ApiResponse_1.ApiResponse.noContent('Project deleted').send(res);
    },
};
//# sourceMappingURL=project.controller.js.map