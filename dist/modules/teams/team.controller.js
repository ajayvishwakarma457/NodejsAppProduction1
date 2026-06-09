"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.teamController = void 0;
const team_service_1 = require("./team.service");
exports.teamController = {
    async list(_req, res) {
        const teams = await team_service_1.teamService.list();
        res.json({ success: true, data: teams });
    }
};
