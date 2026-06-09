"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectController = void 0;
const project_service_1 = require("./project.service");
exports.projectController = {
    async list(_req, res) {
        const projects = await project_service_1.projectService.list();
        res.json({ success: true, data: projects });
    }
};
