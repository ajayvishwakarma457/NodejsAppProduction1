"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const db_1 = require("../../config/db");
const redis_1 = require("../../config/redis");
const redis_service_1 = require("../../services/redis.service");
const helpers_1 = require("./helpers");
/**
 * Global integration test lifecycle.
 *
 * Connects to real MongoDB and Redis instances, cleans collections between
 * tests, and tears down connections when the suite finishes.
 */
(0, vitest_1.beforeAll)(async () => {
    await db_1.db.connect();
    await redis_service_1.redisService.connect();
});
(0, vitest_1.afterEach)(async () => {
    await (0, helpers_1.cleanupCollections)();
});
(0, vitest_1.afterAll)(async () => {
    await (0, helpers_1.cleanupCollections)();
    if (redis_1.redisClient.isOpen) {
        await redis_1.redisClient.flushDb();
        await redis_service_1.redisService.disconnect();
    }
    await db_1.db.disconnect();
});
//# sourceMappingURL=setup.js.map