type LogLevel = "info" | "warn" | "error";

const log = (level: LogLevel, message: string, meta?: unknown) => {
  const payload = {
    level,
    message,
    meta,
    timestamp: new Date().toISOString()
  };

  const printer = level === "error" ? console.error : console.log;
  printer(JSON.stringify(payload));
};

export const logger = {
  info: (message: string, meta?: unknown) => log("info", message, meta),
  warn: (message: string, meta?: unknown) => log("warn", message, meta),
  error: (message: string, meta?: unknown) => log("error", message, meta)
};

