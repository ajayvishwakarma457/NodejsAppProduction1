"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.teamSchema = void 0;
const zod_1 = require("zod");
exports.teamSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1),
        description: zod_1.z.string().min(1)
    })
});
