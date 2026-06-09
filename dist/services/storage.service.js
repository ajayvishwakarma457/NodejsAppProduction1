"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storageService = void 0;
exports.storageService = {
    async upload(fileName) {
        return { fileName, url: `https://example.com/${fileName}` };
    }
};
