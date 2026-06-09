"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeEmail = exports.generateRandomString = exports.isEmpty = exports.omit = exports.pick = exports.sleep = exports.toObjectId = exports.isValidObjectId = exports.isValidId = exports.slugify = void 0;
const mongoose_1 = require("mongoose");
const slugify = (value, options) => {
    const maxLength = options?.maxLength ?? 100;
    return value
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, maxLength);
};
exports.slugify = slugify;
const isValidId = (value) => typeof value === "string" && value.trim().length > 0;
exports.isValidId = isValidId;
const isValidObjectId = (value) => typeof value === "string" && mongoose_1.Types.ObjectId.isValid(value);
exports.isValidObjectId = isValidObjectId;
const toObjectId = (value) => {
    if (!(0, exports.isValidObjectId)(value))
        return null;
    return new mongoose_1.Types.ObjectId(value);
};
exports.toObjectId = toObjectId;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
exports.sleep = sleep;
const pick = (obj, keys) => {
    const result = {};
    for (const key of keys) {
        if (key in obj) {
            result[key] = obj[key];
        }
    }
    return result;
};
exports.pick = pick;
const omit = (obj, keys) => {
    const result = { ...obj };
    for (const key of keys) {
        delete result[key];
    }
    return result;
};
exports.omit = omit;
const isEmpty = (value) => {
    if (value == null)
        return true;
    if (typeof value === "string")
        return value.trim().length === 0;
    if (Array.isArray(value))
        return value.length === 0;
    if (typeof value === "object")
        return Object.keys(value).length === 0;
    return false;
};
exports.isEmpty = isEmpty;
const generateRandomString = (length = 32) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};
exports.generateRandomString = generateRandomString;
const sanitizeEmail = (email) => email.trim().toLowerCase();
exports.sanitizeEmail = sanitizeEmail;
