"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationSchema = void 0;
const zod_1 = require("zod");
exports.notificationSchema = zod_1.z.object({
    body: zod_1.z.object({
        userId: zod_1.z.string().min(1),
        title: zod_1.z.string().min(1),
        message: zod_1.z.string().min(1)
    })
});
