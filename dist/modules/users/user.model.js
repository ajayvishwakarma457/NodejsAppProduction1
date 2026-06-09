"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModel = void 0;
const mongoose_1 = require("mongoose");
const userSchema = new mongoose_1.Schema({
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    avatar: { type: String },
    role: {
        type: String,
        enum: ["admin", "manager", "member"],
        default: "member"
    },
    isVerified: { type: Boolean, default: false },
    refreshToken: { type: String },
    lastLogin: { type: Date }
}, {
    timestamps: true
});
exports.UserModel = (0, mongoose_1.model)("User", userSchema);
