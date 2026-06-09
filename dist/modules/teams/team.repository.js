"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.teamRepository = void 0;
const team_model_1 = require("./team.model");
exports.teamRepository = {
    async findAll() {
        return team_model_1.TeamModel.find().lean();
    },
    async findById(id) {
        return team_model_1.TeamModel.findById(id).lean();
    }
};
