export const TOKEN_PREFIX = {
  access: "access-",
  refresh: "refresh-"
} as const;

export const SOCKET_ROOM_PREFIX = {
  task: "task:",
  team: "team:",
  notification: "notification:"
} as const;

export const SOCKET_EVENTS = {
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
} as const;

export const PAGINATION = {
  defaultPage: 1,
  defaultLimit: 10,
  maxLimit: 100,
  defaultSort: "createdAt"
} as const;

export const CACHE_TTL = {
  short: 60,
  medium: 300,
  long: 3600
} as const;

export const RATE_LIMIT = {
  windowMs: 60 * 1000,
  maxRequests: 100
} as const;

export const TIME = {
  second: 1000,
  minute: 60 * 1000,
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000
} as const;

export const APP_CONSTANTS = {
  pagination: PAGINATION
} as const;
