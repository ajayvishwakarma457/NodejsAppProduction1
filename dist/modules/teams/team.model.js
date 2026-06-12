"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamModel = void 0;
const mongoose_1 = require("mongoose");
/* ------------------------------------------------------------------ */
// Subdocument Schema
/* ------------------------------------------------------------------ */
const teamMemberSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Member userId is required'],
    },
    role: {
        type: String,
        enum: ['owner', 'admin', 'member'],
        default: 'member',
    },
    joinedAt: {
        type: Date,
        default: Date.now,
    },
}, { _id: false });
/* ------------------------------------------------------------------ */
// Main Schema
/* ------------------------------------------------------------------ */
const teamSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: [true, 'Team name is required'],
        trim: true,
        maxlength: [100, 'Team name cannot exceed 100 characters'],
    },
    description: {
        type: String,
        required: [true, 'Team description is required'],
        trim: true,
        maxlength: [500, 'Team description cannot exceed 500 characters'],
    },
    ownerId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Team owner is required'],
    },
    members: {
        type: [teamMemberSchema],
        default: [],
    },
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform(_doc, ret) {
            delete ret.__v;
            ret.id = ret._id;
            delete ret._id;
            return ret;
        },
    },
    toObject: {
        virtuals: true,
        transform(_doc, ret) {
            delete ret.__v;
            return ret;
        },
    },
});
/* ------------------------------------------------------------------ */
// Indexes
/* ------------------------------------------------------------------ */
// Index for looking up teams by owner.
teamSchema.index({ ownerId: 1 }, { name: 'owner_idx' });
// Index for looking up teams a user belongs to (as a member).
teamSchema.index({ 'members.userId': 1 }, { name: 'members_userid_idx' });
// Compound index for default list ordering.
teamSchema.index({ createdAt: -1 }, { name: 'createdat_desc_idx' });
// Text index for team search.
teamSchema.index({ name: 'text', description: 'text' }, { name: 'team_text_search_idx', weights: { name: 10, description: 5 } });
// Compound index for owner-centric listings.
teamSchema.index({ ownerId: 1, createdAt: -1 }, { name: 'owner_createdat_idx' });
// Compound index for member-centric listings with sort.
teamSchema.index({ 'members.userId': 1, createdAt: -1 }, { name: 'member_createdat_idx' });
/* ------------------------------------------------------------------ */
// Virtuals
/* ------------------------------------------------------------------ */
teamSchema.virtual('memberCount').get(function () {
    return this.members?.length ?? 0;
});
exports.TeamModel = (0, mongoose_1.model)('Team', teamSchema);
//# sourceMappingURL=team.model.js.map