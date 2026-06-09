"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectService = void 0;
const project_repository_1 = require("./project.repository");
exports.projectService = {
    async list() {
        return project_repository_1.projectRepository.findAll();
    }
};
