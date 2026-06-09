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
    PORT: zod_1.z.coerce.number().min(1).max(65535).default(4000),
    APP_NAME: zod_1.z.string().min(1).default("NodejsAppProduction1"),
    JWT_SECRET: zod_1.z.string().min(16, "JWT_SECRET must be at least 16 characters").default("change-me-default-dev-only"),
    REDIS_URL: zod_1.z.string().url("REDIS_URL must be a valid URL").default("redis://localhost:6379"),
    MONGODB_URI: zod_1.z.string().url("MONGODB_URI must be a valid URL").default("mongodb://127.0.0.1:27017/nodejs-app-production1"),
    CLIENT_URL: zod_1.z.string().min(1).default("*"),
    LOG_LEVEL: zod_1.z.enum(["debug", "info", "warn", "error"]).default("info"),
    SMTP_HOST: zod_1.z.string().optional().default(""),
    SMTP_PORT: zod_1.z.coerce.number().min(1).max(65535).default(587),
    SMTP_SECURE: zod_1.z.preprocess((val) => val === "true" || val === true, zod_1.z.boolean().default(false)),
    SMTP_USER: zod_1.z.string().optional().default(""),
    SMTP_PASS: zod_1.z.string().optional().default(""),
    SMTP_FROM: zod_1.z.string().optional().default("")
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    const messages = parsed.error.issues.map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`);
    // eslint-disable-next-line no-console
    console.error("Environment validation failed:\n" + messages.join("\n"));
    process.exit(1);
}
exports.env = parsed.data;
