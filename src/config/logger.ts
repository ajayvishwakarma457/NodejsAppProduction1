import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { env } from './env';

/**
 * Recursively serialize Error instances so stack traces are preserved
 * when errors are passed inside the `meta` object.
 */
const serializeErrors = (value: unknown): unknown => {
  if (value instanceof Error) {
    return { message: value.message, stack: value.stack, name: value.name };
  }

  if (Array.isArray(value)) {
    return value.map(serializeErrors);
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const cloned: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(record)) {
      cloned[key] = serializeErrors(val);
    }
    return cloned;
  }

  return value;
};

const nestedErrorsFormat = winston.format((info) => {
  if (info.meta !== undefined) {
    info.meta = serializeErrors(info.meta);
  }

  // Winston splat merges extra args into the info object; scan top-level keys
  // for nested errors too.
  for (const key of Object.keys(info)) {
    if (key !== 'level' && key !== 'message' && key !== 'timestamp' && key !== 'meta') {
      (info as Record<string, unknown>)[key] = serializeErrors(
        (info as Record<string, unknown>)[key]
      );
    }
  }

  return info;
});

const usePrettyFormat = env.LOG_FORMAT === 'pretty';

const consoleFormat = usePrettyFormat
  ? winston.format.combine(
      winston.format.colorize({ all: true }),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(({ level, message, timestamp, ...rest }) => {
        const meta = Object.keys(rest).length ? ` ${JSON.stringify(rest)}` : '';
        return `${timestamp} [${level}]: ${message}${meta}`;
      })
    )
  : winston.format.combine(winston.format.timestamp(), nestedErrorsFormat(), winston.format.json());

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: consoleFormat,
  }),
];

if (env.NODE_ENV === 'production') {
  const fileFormat = winston.format.combine(
    winston.format.timestamp(),
    nestedErrorsFormat(),
    winston.format.json()
  );

  transports.push(
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
      format: fileFormat,
    }),
    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format: fileFormat,
    })
  );
}

const winstonLogger = winston.createLogger({
  level: env.LOG_LEVEL,
  defaultMeta: {
    env: env.NODE_ENV,
    app: env.APP_NAME,
  },
  transports,
  // Do not exit on uncaught errors inside the logger itself.
  exitOnError: false,
});

/**
 * Production-grade structured logger built on Winston.
 *
 * Logs are emitted as JSON in production and test environments, and as
 * colorized pretty output in development. In production, logs are also
 * persisted to rotating files under `./logs/`.
 *
 * The exported API (`debug`, `info`, `warn`, `error`) is unchanged from the
 * previous custom logger so existing call sites continue to work.
 */
export const logger = {
  debug: (message: string, meta?: unknown) => {
    winstonLogger.debug(message, meta ? { meta: serializeErrors(meta) } : undefined);
  },
  info: (message: string, meta?: unknown) => {
    winstonLogger.info(message, meta ? { meta: serializeErrors(meta) } : undefined);
  },
  warn: (message: string, meta?: unknown) => {
    winstonLogger.warn(message, meta ? { meta: serializeErrors(meta) } : undefined);
  },
  error: (message: string, meta?: unknown) => {
    winstonLogger.error(message, meta ? { meta: serializeErrors(meta) } : undefined);
  },
};

/**
 * Create a child logger that automatically includes the given metadata
 * in every log entry. Useful for attaching a request correlation ID.
 */
export const createChildLogger = (defaultMeta: Record<string, unknown>) => {
  const child = winstonLogger.child(defaultMeta);

  return {
    debug: (message: string, meta?: unknown) => {
      child.debug(message, meta ? { meta: serializeErrors(meta) } : undefined);
    },
    info: (message: string, meta?: unknown) => {
      child.info(message, meta ? { meta: serializeErrors(meta) } : undefined);
    },
    warn: (message: string, meta?: unknown) => {
      child.warn(message, meta ? { meta: serializeErrors(meta) } : undefined);
    },
    error: (message: string, meta?: unknown) => {
      child.error(message, meta ? { meta: serializeErrors(meta) } : undefined);
    },
  };
};
