"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeederModel = void 0;
const mongoose_1 = require("mongoose");
const seederSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    runAt: {
        type: Date,
        default: Date.now,
    },
    environment: {
        type: String,
        required: true,
    },
}, {
    timestamps: false,
});
seederSchema.index({ runAt: 1 });
exports.SeederModel = (0, mongoose_1.model)('Seeder', seederSchema);
//# sourceMappingURL=seeder.model.js.map