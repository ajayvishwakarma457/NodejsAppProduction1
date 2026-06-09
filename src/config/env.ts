import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().min(1).max(65535).default(4000),
  APP_NAME: z.string().min(1).default("NodejsAppProduction1"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters").default("change-me-default-dev-only"),
  REDIS_URL: z.string().url("REDIS_URL must be a valid URL").default("redis://localhost:6379"),
  MONGODB_URI: z.string().url("MONGODB_URI must be a valid URL").default("mongodb://127.0.0.1:27017/nodejs-app-production1"),
  CLIENT_URL: z.string().min(1).default("*"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

  SMTP_HOST: z.string().optional().default(""),
  SMTP_PORT: z.coerce.number().min(1).max(65535).default(587),
  SMTP_SECURE: z.preprocess((val) => val === "true" || val === true, z.boolean().default(false)),
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASS: z.string().optional().default(""),
  SMTP_FROM: z.string().optional().default("")
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const messages = parsed.error.issues.map(
    (issue) => `  - ${issue.path.join(".")}: ${issue.message}`
  );

  // eslint-disable-next-line no-console
  console.error("Environment validation failed:\n" + messages.join("\n"));
  process.exit(1);
}

export const env = parsed.data;
