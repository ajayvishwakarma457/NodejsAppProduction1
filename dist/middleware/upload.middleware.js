"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadMultipleMiddleware = exports.uploadMiddleware = exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const env_1 = require("../config/env");
const storage_service_1 = require("../services/storage.service");
const storage = multer_1.default.memoryStorage();
const limits = {
    fileSize: env_1.env.STORAGE_MAX_FILE_SIZE_MB * 1024 * 1024,
    files: 5
};
exports.upload = (0, multer_1.default)({
    storage,
    limits,
    fileFilter: storage_service_1.storageService.multerFileFilter
});
exports.uploadMiddleware = exports.upload.single("file");
exports.uploadMultipleMiddleware = exports.upload.array("files", 5);
