"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = void 0;
exports.emailService = {
    async send(to, subject, body) {
        return { to, subject, body, queued: true };
    }
};
