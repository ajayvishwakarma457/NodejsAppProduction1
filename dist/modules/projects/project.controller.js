"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectController = void 0;
const http_status_codes_1 = require("http-status-codes");
const project_service_1 = require("./project.service");
const ApiResponse_1 = require("../../utils/ApiResponse");
exports.projectController = {
    async list(req, res) {
        const { data, meta } = await project_service_1.projectService.list(req.query);
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
        const project = await project_service_1.projectService.create(req.body);
        ApiResponse_1.ApiResponse.created(project, 'Project created').send(res);
    },
    async update(req, res) {
        const project = await project_service_1.projectService.update(req.params.id, req.body);
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
        const deleted = await project_service_1.projectService.remove(req.params.id);
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