"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.APP_CONSTANTS = exports.TIME = exports.RATE_LIMIT = exports.CACHE_TTL = exports.PAGINATION = exports.SOCKET_EVENTS = exports.SOCKET_ROOM_PREFIX = exports.TOKEN_PREFIX = void 0;
exports.TOKEN_PREFIX = {
    access: "access-",
    refresh: "refresh-"
};
exports.SOCKET_ROOM_PREFIX = {
    task: "task:",
    team: "team:",
    notification: "notification:"
};
exports.SOCKET_EVENTS = {
    connection: {
        error: "connection:error"
    },
    task: {
        join: "task:join",
        leave: "task:leave",
        joined: "task:joined",
        left: "task:left",
        error: "task:error"
    },
    team: {
        join: "team:join",
        leave: "team:leave",
        joined: "team:joined",
        left: "team:left",
        error: "team:error"
    },
    notification: {
        read: "notification:read",
        ack: "notification:ack",
        error: "notification:error"
    }
};
exports.PAGINATION = {
    defaultPage: 1,
    defaultLimit: 10,
    maxLimit: 100,
    defaultSort: "createdAt"
};
exports.CACHE_TTL = {
    short: 60,
    medium: 300,
    long: 3600
};
exports.RATE_LIMIT = {
    windowMs: 60 * 1000,
    maxRequests: 100
};
exports.TIME = {
    second: 1000,
    minute: 60 * 1000,
    hour: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000
};
exports.APP_CONSTANTS = {
    pagination: exports.PAGINATION
};
