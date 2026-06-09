"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamModel = void 0;
const mongoose_1 = require("mongoose");
const teamMemberSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    role: {
        type: String,
        enum: ["owner", "admin", "member"],
        default: "member"
    },
    joinedAt: { type: Date, default: Date.now }
}, { _id: false });
const teamSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    ownerId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    members: { type: [teamMemberSchema], default: [] }
}, {
    timestamps: true
});
exports.TeamModel = (0, mongoose_1.model)("Team", teamSchema);
