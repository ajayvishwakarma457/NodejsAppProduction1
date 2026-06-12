"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MigrationModel = void 0;
const mongoose_1 = require("mongoose");
const migrationSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    appliedAt: {
        type: Date,
        default: Date.now,
    },
    batch: {
        type: Number,
        required: true,
    },
}, {
    timestamps: false,
});
migrationSchema.index({ appliedAt: 1 });
exports.MigrationModel = (0, mongoose_1.model)('Migration', migrationSchema);
//# sourceMappingURL=migration.model.js.map