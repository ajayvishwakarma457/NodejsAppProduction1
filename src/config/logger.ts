import { env } from "./env";

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const getMinLogLevel = (): LogLevel => env.LOG_LEVEL;

const isLevelEnabled = (level: LogLevel): boolean => {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[getMinLogLevel()];
};

const safeStringify = (value: unknown): string => {
  try {
    return JSON.stringify(value);
  } catch {
    return "[object with circular reference]";
  }
};

const extractErrorDetails = (meta: unknown): unknown => {
  if (meta instanceof Error) {
    return { message: meta.message, stack: meta.stack };
  }

  if (meta && typeof meta === "object") {
    const record = meta as Record<string, unknown>;
    const cloned: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(record)) {
      if (value instanceof Error) {
        cloned[key] = { message: value.message, stack: value.stack };
      } else {
        cloned[key] = value;
      }
    }

    return cloned;
  }

  return meta;
};

const buildLogPayload = (level: LogLevel, message: string, meta?: unknown) => {
  return {
    level,
    message,
    meta: extractErrorDetails(meta),
    timestamp: new Date().toISOString(),
    env: env.NODE_ENV,
    app: env.APP_NAME
  };
};

const log = (level: LogLevel, message: string, meta?: unknown) => {
  if (!isLevelEnabled(level)) return;

  const payload = buildLogPayload(level, message, meta);

  if (env.NODE_ENV === "development") {
    const printer = level === "error" ? console.error : console.log;
    const metaStr = meta ? ` ${safeStringify(payload.meta)}` : "";
    printer(`[${payload.timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`);
    return;
  }

  const printer = level === "error" ? console.error : console.log;
  printer(safeStringify(payload));
};

export const logger = {
  debug: (message: string, meta?: unknown) => log("debug", message, meta),
  info: (message: string, meta?: unknown) => log("info", message, meta),
  warn: (message: string, meta?: unknown) => log("warn", message, meta),
  error: (message: string, meta?: unknown) => log("error", message, meta)
};
