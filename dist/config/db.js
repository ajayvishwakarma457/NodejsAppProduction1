"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const logger_1 = require("./logger");
const env_1 = require("./env");
const MAX_RETRIES = 5;
const BASE_RETRY_DELAY_MS = 1000;
const sanitizeUrl = (url) => {
    try {
        const parsed = new URL(url);
        if (parsed.password) {
            parsed.password = "****";
        }
        return parsed.toString();
    }
    catch {
        return url;
    }
};
const getConnectionOptions = () => ({
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
    retryWrites: true
});
const bindConnectionEvents = () => {
    mongoose_1.default.connection.on("connected", () => {
        logger_1.logger.info("MongoDB connection established");
    });
    mongoose_1.default.connection.on("error", (err) => {
        logger_1.logger.error("MongoDB connection error", { error: err.message });
    });
    mongoose_1.default.connection.on("disconnected", () => {
        logger_1.logger.warn("MongoDB connection disconnected");
    });
    mongoose_1.default.connection.on("reconnected", () => {
        logger_1.logger.info("MongoDB connection reconnected");
    });
};
exports.db = {
    url: env_1.env.MONGODB_URI,
    async connect(retries = MAX_RETRIES, delay = BASE_RETRY_DELAY_MS) {
        bindConnectionEvents();
        try {
            await mongoose_1.default.connect(env_1.env.MONGODB_URI, getConnectionOptions());
            logger_1.logger.info("MongoDB connected", { url: sanitizeUrl(env_1.env.MONGODB_URI) });
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            logger_1.logger.error("MongoDB connection failed", {
                error: err.message,
                retriesLeft: retries,
                url: sanitizeUrl(env_1.env.MONGODB_URI)
            });
            if (retries > 0) {
                logger_1.logger.info(`Retrying MongoDB connection in ${delay}ms...`);
                await new Promise((resolve) => setTimeout(resolve, delay));
                return this.connect(retries - 1, delay * 2);
            }
            throw new Error(`Unable to connect to MongoDB after ${MAX_RETRIES} attempts: ${err.message}`);
        }
    },
    async disconnect() {
        if (mongoose_1.default.connection.readyState === 0) {
            logger_1.logger.info("MongoDB already disconnected");
            return;
        }
        await mongoose_1.default.disconnect();
        logger_1.logger.info("MongoDB disconnected");
    }
};
