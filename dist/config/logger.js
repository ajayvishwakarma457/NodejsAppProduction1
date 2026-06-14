"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createChildLogger = exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const winston_daily_rotate_file_1 = __importDefault(require("winston-daily-rotate-file"));
const env_1 = require("./env");
/**
 * Recursively serialize Error instances so stack traces are preserved
 * when errors are passed inside the `meta` object.
 */
const serializeErrors = (value) => {
    if (value instanceof Error) {
        return { message: value.message, stack: value.stack, name: value.name };
    }
    if (Array.isArray(value)) {
        return value.map(serializeErrors);
    }
    if (value && typeof value === 'object') {
        const record = value;
        const cloned = {};
        for (const [key, val] of Object.entries(record)) {
            cloned[key] = serializeErrors(val);
        }
        return cloned;
    }
    return value;
};
const nestedErrorsFormat = winston_1.default.format((info) => {
    if (info.meta !== undefined) {
        info.meta = serializeErrors(info.meta);
    }
    // Winston splat merges extra args into the info object; scan top-level keys
    // for nested errors too.
    for (const key of Object.keys(info)) {
        if (key !== 'level' && key !== 'message' && key !== 'timestamp' && key !== 'meta') {
            info[key] = serializeErrors(info[key]);
        }
    }
    return info;
});
const usePrettyFormat = env_1.env.LOG_FORMAT === 'pretty';
const consoleFormat = usePrettyFormat
    ? winston_1.default.format.combine(winston_1.default.format.colorize({ all: true }), winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.printf(({ level, message, timestamp, ...rest }) => {
        const meta = Object.keys(rest).length ? ` ${JSON.stringify(rest)}` : '';
        return `${timestamp} [${level}]: ${message}${meta}`;
    }))
    : winston_1.default.format.combine(winston_1.default.format.timestamp(), nestedErrorsFormat(), winston_1.default.format.json());
const transports = [
    new winston_1.default.transports.Console({
        format: consoleFormat,
    }),
];
if (env_1.env.NODE_ENV === 'production') {
    const fileFormat = winston_1.default.format.combine(winston_1.default.format.timestamp(), nestedErrorsFormat(), winston_1.default.format.json());
    transports.push(new winston_daily_rotate_file_1.default({
        filename: 'logs/error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        maxSize: '20m',
        maxFiles: '14d',
        format: fileFormat,
    }), new winston_daily_rotate_file_1.default({
        filename: 'logs/combined-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        format: fileFormat,
    }));
}
const winstonLogger = winston_1.default.createLogger({
    level: env_1.env.LOG_LEVEL,
    defaultMeta: {
        env: env_1.env.NODE_ENV,
        app: env_1.env.APP_NAME,
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
exports.logger = {
    debug: (message, meta) => {
        winstonLogger.debug(message, meta ? { meta: serializeErrors(meta) } : undefined);
    },
    info: (message, meta) => {
        winstonLogger.info(message, meta ? { meta: serializeErrors(meta) } : undefined);
    },
    warn: (message, meta) => {
        winstonLogger.warn(message, meta ? { meta: serializeErrors(meta) } : undefined);
    },
    error: (message, meta) => {
        winstonLogger.error(message, meta ? { meta: serializeErrors(meta) } : undefined);
    },
};
/**
 * Create a child logger that automatically includes the given metadata
 * in every log entry. Useful for attaching a request correlation ID.
 */
const createChildLogger = (defaultMeta) => {
    const child = winstonLogger.child(defaultMeta);
    return {
        debug: (message, meta) => {
            child.debug(message, meta ? { meta: serializeErrors(meta) } : undefined);
        },
        info: (message, meta) => {
            child.info(message, meta ? { meta: serializeErrors(meta) } : undefined);
        },
        warn: (message, meta) => {
            child.warn(message, meta ? { meta: serializeErrors(meta) } : undefined);
        },
        error: (message, meta) => {
            child.error(message, meta ? { meta: serializeErrors(meta) } : undefined);
        },
    };
};
exports.createChildLogger = createChildLogger;
//# sourceMappingURL=logger.js.map