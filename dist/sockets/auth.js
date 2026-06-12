"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseSocketUser = void 0;
const token_service_1 = require("../services/token.service");
const parseSocketUser = (socket) => {
    try {
        const token = socket.handshake.auth.token;
        if (!token)
            return null;
        const payload = token_service_1.tokenService.verifyAccessToken(token);
        return { id: payload.sub, email: payload.email, role: payload.role };
    }
    catch {
        return null;
    }
};
exports.parseSocketUser = parseSocketUser;
//# sourceMappingURL=auth.js.map