"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const env_1 = require("./env");
const LOG_LEVEL_PRIORITY = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};
const getMinLogLevel = () => env_1.env.LOG_LEVEL;
const isLevelEnabled = (level) => {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[getMinLogLevel()];
};
const safeStringify = (value) => {
    try {
        return JSON.stringify(value);
    }
    catch {
        return '[object with circular reference]';
    }
};
const extractErrorDetails = (meta) => {
    if (meta instanceof Error) {
        return { message: meta.message, stack: meta.stack };
    }
    if (meta && typeof meta === 'object') {
        const record = meta;
        const cloned = {};
        for (const [key, value] of Object.entries(record)) {
            if (value instanceof Error) {
                cloned[key] = { message: value.message, stack: value.stack };
            }
            else {
                cloned[key] = value;
            }
        }
        return cloned;
    }
    return meta;
};
const buildLogPayload = (level, message, meta) => {
    return {
        level,
        message,
        meta: extractErrorDetails(meta),
        timestamp: new Date().toISOString(),
        env: env_1.env.NODE_ENV,
        app: env_1.env.APP_NAME,
    };
};
const log = (level, message, meta) => {
    if (!isLevelEnabled(level))
        return;
    const payload = buildLogPayload(level, message, meta);
    if (env_1.env.NODE_ENV === 'development') {
        const printer = level === 'error' ? console.error : console.log;
        const metaStr = meta ? ` ${safeStringify(payload.meta)}` : '';
        printer(`[${payload.timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`);
        return;
    }
    const printer = level === 'error' ? console.error : console.log;
    printer(safeStringify(payload));
};
exports.logger = {
    debug: (message, meta) => log('debug', message, meta),
    info: (message, meta) => log('info', message, meta),
    warn: (message, meta) => log('warn', message, meta),
    error: (message, meta) => log('error', message, meta),
};
//# sourceMappingURL=logger.js.map