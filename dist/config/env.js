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
    // AWS S3 (required when STORAGE_PROVIDER=s3)
    AWS_REGION: zod_1.z.string().optional().default('us-east-1'),
    AWS_ACCESS_KEY_ID: zod_1.z.string().optional().default(''),
    AWS_SECRET_ACCESS_KEY: zod_1.z.string().optional().default(''),
    S3_BUCKET_NAME: zod_1.z.string().optional().default(''),
    S3_ENDPOINT: zod_1.z.string().url().optional(),
    S3_FORCE_PATH_STYLE: zod_1.z.preprocess((val) => val === 'true' || val === true, zod_1.z.boolean().default(false)),
    S3_PUBLIC_URL: zod_1.z.string().url().optional(),
    // Image processing
    IMAGE_PROCESSING_ENABLED: zod_1.z.preprocess((val) => val === 'true' || val === true, zod_1.z.boolean().default(false)),
    IMAGE_MAX_WIDTH: zod_1.z.coerce.number().min(1).default(1920),
    IMAGE_MAX_HEIGHT: zod_1.z.coerce.number().min(1).default(1080),
    IMAGE_QUALITY: zod_1.z.coerce.number().min(1).max(100).default(80),
    IMAGE_OUTPUT_FORMAT: zod_1.z.enum(['webp', 'jpeg', 'png', 'avif']).default('webp'),
    IMAGE_VARIANTS: zod_1.z
        .string()
        .optional()
        .default('thumbnail:150x150:cover,medium:800x600:inside,large:1920x1080:inside'),
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
    // Distributed cron job locking (prevents multiple server instances from running the same cron job)
    CRON_JOB_LOCK_TTL_SECONDS: zod_1.z.coerce.number().min(1).max(3600).default(60),
    RATE_LIMIT_ENABLED: zod_1.z.preprocess((val) => val === 'true' || val === true, zod_1.z.boolean().default(false)),
    RATE_LIMIT_WINDOW_MS: zod_1.z.coerce.number().min(1000).max(3600000).default(900000),
    RATE_LIMIT_MAX_REQUESTS: zod_1.z.coerce.number().min(1).max(10000).default(100),
    RATE_LIMIT_AUTHENTICATED_MAX_REQUESTS: zod_1.z.coerce.number().min(1).max(10000).default(200),
    // API Key authentication
    API_KEY_HEADER_NAME: zod_1.z.string().min(1).default('X-API-Key'),
    API_KEY_PREFIX: zod_1.z.string().min(1).default('npak_'),
    API_KEY_HASH_SALT_ROUNDS: zod_1.z.coerce.number().min(4).max(20).default(10),
    API_KEY_MAX_KEYS_PER_USER: zod_1.z.coerce.number().min(1).max(100).default(10),
    API_KEY_DEFAULT_EXPIRY_DAYS: zod_1.z.coerce.number().min(1).max(365).default(365),
    // OAuth
    GOOGLE_CLIENT_ID: zod_1.z.string().optional().default(''),
    GOOGLE_CLIENT_SECRET: zod_1.z.string().optional().default(''),
    GOOGLE_CALLBACK_URL: zod_1.z
        .string()
        .url()
        .optional()
        .default('http://localhost:4000/api/v1/auth/google/callback'),
    GITHUB_CLIENT_ID: zod_1.z.string().optional().default(''),
    GITHUB_CLIENT_SECRET: zod_1.z.string().optional().default(''),
    GITHUB_CALLBACK_URL: zod_1.z
        .string()
        .url()
        .optional()
        .default('http://localhost:4000/api/v1/auth/github/callback'),
    // Database migrations and seeding
    SEED_ALLOWED_ENVS: zod_1.z
        .string()
        .optional()
        .default('development,test,staging')
        .transform((val) => val
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    const messages = parsed.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`);
    console.error('Environment validation failed:\n' + messages.join('\n'));
    process.exit(1);
}
exports.env = parsed.data;
//# sourceMappingURL=env.js.map