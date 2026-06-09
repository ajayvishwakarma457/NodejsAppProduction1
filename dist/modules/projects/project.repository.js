"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectRepository = void 0;
const project_model_1 = require("./project.model");
exports.projectRepository = {
    async findAll() {
        return project_model_1.ProjectModel.find().lean();
    }
};
