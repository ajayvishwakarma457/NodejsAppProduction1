"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const log = (level, message, meta) => {
    const payload = {
        level,
        message,
        meta,
        timestamp: new Date().toISOString()
    };
    const printer = level === "error" ? console.error : console.log;
    printer(JSON.stringify(payload));
};
exports.logger = {
    info: (message, meta) => log("info", message, meta),
    warn: (message, meta) => log("warn", message, meta),
    error: (message, meta) => log("error", message, meta)
};
