import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  APP_NAME: z.string().default("NodejsAppProduction1"),
  JWT_SECRET: z.string().default("change-me"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  MONGODB_URI: z.string().default("mongodb://127.0.0.1:27017/nodejs-app-production1"),
  CLIENT_URL: z.string().default("*")
});

export const env = envSchema.parse(process.env);
