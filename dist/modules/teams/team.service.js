"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.teamService = void 0;
const team_repository_1 = require("./team.repository");
exports.teamService = {
    async list() {
        return team_repository_1.teamRepository.findAll();
    }
};
