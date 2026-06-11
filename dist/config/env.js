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
    NODE_ENV: zod_1.z.enum(['development', 'test', 'production']).default('development'),
    PORT: zod_1.z.coerce.number().min(1).max(65535).default(4000),
    APP_NAME: zod_1.z.string().min(1).default('NodejsAppProduction1'),
    JWT_SECRET: zod_1.z
        .string()
        .min(16, 'JWT_SECRET must be at least 16 characters')
        .default('change-me-default-dev-only'),
    JWT_REFRESH_SECRET: zod_1.z
        .string()
        .min(16, 'JWT_REFRESH_SECRET must be at least 16 characters')
        .default('change-me-default-refresh-dev-only'),
    JWT_ACCESS_EXPIRES_IN: zod_1.z.string().min(1).default('15m'),
    JWT_REFRESH_EXPIRES_IN: zod_1.z.string().min(1).default('7d'),
    REDIS_URL: zod_1.z.string().url('REDIS_URL must be a valid URL').default('redis://localhost:6379'),
    MONGODB_URI: zod_1.z
        .string()
        .url('MONGODB_URI must be a valid URL')
        .default('mongodb://127.0.0.1:27017/nodejs-app-production1'),
    CLIENT_URL: zod_1.z.string().min(1).default('*'),
    LOG_LEVEL: zod_1.z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    SMTP_HOST: zod_1.z.string().optional().default(''),
    SMTP_PORT: zod_1.z.coerce.number().min(1).max(65535).default(587),
    SMTP_SECURE: zod_1.z.preprocess((val) => val === 'true' || val === true, zod_1.z.boolean().default(false)),
    SMTP_USER: zod_1.z.string().optional().default(''),
    SMTP_PASS: zod_1.z.string().optional().default(''),
    SMTP_FROM: zod_1.z.string().optional().default(''),
    STORAGE_PROVIDER: zod_1.z.enum(['local', 's3']).default('local'),
    STORAGE_LOCAL_PATH: zod_1.z.string().min(1).default('uploads'),
    STORAGE_MAX_FILE_SIZE_MB: zod_1.z.coerce.number().min(1).max(500).default(10),
    STORAGE_ALLOWED_MIME_TYPES: zod_1.z
        .string()
        .optional()
        .default('image/jpeg,image/png,image/webp,application/pdf'),
    EMAIL_JOB_ENABLED: zod_1.z.preprocess((val) => val === 'true' || val === true, zod_1.z.boolean().default(false)),
    EMAIL_JOB_CRON: zod_1.z.string().min(1).default('*/30 * * * * *'),
    EMAIL_JOB_BATCH_SIZE: zod_1.z.coerce.number().min(1).max(100).default(10),
    EMAIL_JOB_MAX_RETRIES: zod_1.z.coerce.number().min(0).max(10).default(3),
    NOTIFICATION_JOB_ENABLED: zod_1.z.preprocess((val) => val === 'true' || val === true, zod_1.z.boolean().default(false)),
    NOTIFICATION_JOB_CRON: zod_1.z.string().min(1).default('*/15 * * * * *'),
    NOTIFICATION_JOB_BATCH_SIZE: zod_1.z.coerce.number().min(1).max(100).default(20),
    NOTIFICATION_JOB_MAX_RETRIES: zod_1.z.coerce.number().min(0).max(10).default(3),
    NOTIFICATION_CLEANUP_DAYS: zod_1.z.coerce.number().min(1).max(365).default(30),
    REMINDER_JOB_ENABLED: zod_1.z.preprocess((val) => val === 'true' || val === true, zod_1.z.boolean().default(false)),
    REMINDER_JOB_CRON: zod_1.z.string().min(1).default('0 */6 * * *'),
    REMINDER_JOB_BATCH_SIZE: zod_1.z.coerce.number().min(1).max(100).default(50),
    REMINDER_WINDOWS_MINUTES: zod_1.z.string().min(1).default('1440,60,15'),
    REMINDER_OVERDUE_ENABLED: zod_1.z.preprocess((val) => {
        if (val === undefined)
            return true;
        return val === 'true' || val === true;
    }, zod_1.z.boolean()),
    RATE_LIMIT_ENABLED: zod_1.z.preprocess((val) => val === 'true' || val === true, zod_1.z.boolean().default(false)),
    RATE_LIMIT_WINDOW_MS: zod_1.z.coerce.number().min(1000).max(3600000).default(900000),
    RATE_LIMIT_MAX_REQUESTS: zod_1.z.coerce.number().min(1).max(10000).default(100),
    RATE_LIMIT_AUTHENTICATED_MAX_REQUESTS: zod_1.z.coerce.number().min(1).max(10000).default(200),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    const messages = parsed.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`);
    console.error('Environment validation failed:\n' + messages.join('\n'));
    process.exit(1);
}
exports.env = parsed.data;
//# sourceMappingURL=env.js.map