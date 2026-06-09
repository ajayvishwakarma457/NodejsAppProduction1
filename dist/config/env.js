"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(["development", "test", "production"]).default("development"),
    PORT: zod_1.z.coerce.number().default(4000),
    APP_NAME: zod_1.z.string().default("NodejsAppProduction1"),
    JWT_SECRET: zod_1.z.string().default("change-me"),
    REDIS_URL: zod_1.z.string().default("redis://localhost:6379"),
    MONGODB_URI: zod_1.z.string().default("mongodb://127.0.0.1:27017/nodejs-app-production1")
});
exports.env = envSchema.parse(process.env);
