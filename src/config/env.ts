import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().min(1).max(65535).default(4000),
  APP_NAME: z.string().min(1).default('NodejsAppProduction1'),
  JWT_SECRET: z
    .string()
    .min(16, 'JWT_SECRET must be at least 16 characters')
    .default('change-me-default-dev-only'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(16, 'JWT_REFRESH_SECRET must be at least 16 characters')
    .default('change-me-default-refresh-dev-only'),
  JWT_ACCESS_EXPIRES_IN: z.string().min(1).default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().min(1).default('7d'),
  REDIS_URL: z.string().url('REDIS_URL must be a valid URL').default('redis://localhost:6379'),
  MONGODB_URI: z
    .string()
    .url('MONGODB_URI must be a valid URL')
    .default('mongodb://127.0.0.1:27017/nodejs-app-production1'),
  CLIENT_URL: z.string().min(1).default('*'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.coerce.number().min(1).max(65535).default(587),
  SMTP_SECURE: z.preprocess((val) => val === 'true' || val === true, z.boolean().default(false)),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  SMTP_FROM: z.string().optional().default(''),

  STORAGE_PROVIDER: z.enum(['local', 's3']).default('local'),
  STORAGE_LOCAL_PATH: z.string().min(1).default('uploads'),
  STORAGE_MAX_FILE_SIZE_MB: z.coerce.number().min(1).max(500).default(10),
  STORAGE_ALLOWED_MIME_TYPES: z
    .string()
    .optional()
    .default('image/jpeg,image/png,image/webp,application/pdf'),

  EMAIL_JOB_ENABLED: z.preprocess(
    (val) => val === 'true' || val === true,
    z.boolean().default(false)
  ),
  EMAIL_JOB_CRON: z.string().min(1).default('*/30 * * * * *'),
  EMAIL_JOB_BATCH_SIZE: z.coerce.number().min(1).max(100).default(10),
  EMAIL_JOB_MAX_RETRIES: z.coerce.number().min(0).max(10).default(3),

  NOTIFICATION_JOB_ENABLED: z.preprocess(
    (val) => val === 'true' || val === true,
    z.boolean().default(false)
  ),
  NOTIFICATION_JOB_CRON: z.string().min(1).default('*/15 * * * * *'),
  NOTIFICATION_JOB_BATCH_SIZE: z.coerce.number().min(1).max(100).default(20),
  NOTIFICATION_JOB_MAX_RETRIES: z.coerce.number().min(0).max(10).default(3),
  NOTIFICATION_CLEANUP_DAYS: z.coerce.number().min(1).max(365).default(30),

  REMINDER_JOB_ENABLED: z.preprocess(
    (val) => val === 'true' || val === true,
    z.boolean().default(false)
  ),
  REMINDER_JOB_CRON: z.string().min(1).default('0 */6 * * *'),
  REMINDER_JOB_BATCH_SIZE: z.coerce.number().min(1).max(100).default(50),
  REMINDER_WINDOWS_MINUTES: z.string().min(1).default('1440,60,15'),
  REMINDER_OVERDUE_ENABLED: z.preprocess((val) => {
    if (val === undefined) return true;
    return val === 'true' || val === true;
  }, z.boolean()),

  RATE_LIMIT_ENABLED: z.preprocess(
    (val) => val === 'true' || val === true,
    z.boolean().default(false)
  ),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().min(1000).max(3600000).default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().min(1).max(10000).default(100),
  RATE_LIMIT_AUTHENTICATED_MAX_REQUESTS: z.coerce.number().min(1).max(10000).default(200),

  // OAuth
  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(''),
  GOOGLE_CALLBACK_URL: z
    .string()
    .url()
    .optional()
    .default('http://localhost:4000/api/v1/auth/google/callback'),
  GITHUB_CLIENT_ID: z.string().optional().default(''),
  GITHUB_CLIENT_SECRET: z.string().optional().default(''),
  GITHUB_CALLBACK_URL: z
    .string()
    .url()
    .optional()
    .default('http://localhost:4000/api/v1/auth/github/callback'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const messages = parsed.error.issues.map(
    (issue) => `  - ${issue.path.join('.')}: ${issue.message}`
  );

  console.error('Environment validation failed:\n' + messages.join('\n'));
  process.exit(1);
}

export const env = parsed.data;
