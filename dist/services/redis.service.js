"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisService = void 0;
const redis_1 = require("../config/redis");
exports.redisService = {
    client: redis_1.redisClient
};
