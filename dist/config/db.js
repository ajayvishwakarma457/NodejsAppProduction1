"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const logger_1 = require("./logger");
const env_1 = require("./env");
exports.db = {
    url: env_1.env.MONGODB_URI,
    async connect() {
        await mongoose_1.default.connect(env_1.env.MONGODB_URI);
        logger_1.logger.info("MongoDB connected", { url: env_1.env.MONGODB_URI });
    }
};
