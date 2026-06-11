"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = void 0;
const http_status_codes_1 = require("http-status-codes");
const auth_service_1 = require("./auth.service");
const oauth_service_1 = require("./oauth.service");
const ApiResponse_1 = require("../../utils/ApiResponse");
const extractBearerToken = (req) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || typeof authHeader !== 'string')
        return null;
    const [scheme, token] = authHeader.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token)
        return null;
    return token;
};
exports.authController = {
    async register(req, res) {
        const result = await auth_service_1.authService.register(req.body);
        ApiResponse_1.ApiResponse.created(result, 'User registered successfully').send(res);
    },
    async login(req, res) {
        const { email, password } = req.body;
        const result = await auth_service_1.authService.login(email, password);
        ApiResponse_1.ApiResponse.ok(result, 'Login successful').send(res);
    },
    async logout(req, res) {
        const accessToken = extractBearerToken(req);
        const { refreshToken } = req.body;
        if (!accessToken) {
            res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Access token required',
            });
            return;
        }
        await auth_service_1.authService.logout(accessToken, refreshToken);
        ApiResponse_1.ApiResponse.ok(null, 'Logout successful').send(res);
    },
    async refresh(req, res) {
        const { refreshToken } = req.body;
        const tokens = await auth_service_1.authService.refresh(refreshToken);
        ApiResponse_1.ApiResponse.ok(tokens, 'Token refreshed').send(res);
    },
    async me(req, res) {
        const user = await auth_service_1.authService.me(req.user.id);
        if (!user) {
            res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'User not found',
            });
            return;
        }
        ApiResponse_1.ApiResponse.ok(user).send(res);
    },
    async changePassword(req, res) {
        const userId = req.user.id;
        const { oldPassword, newPassword } = req.body;
        await auth_service_1.authService.changePassword(userId, oldPassword, newPassword);
        ApiResponse_1.ApiResponse.ok(null, 'Password changed successfully').send(res);
    },
    async oauthCallback(req, res) {
        const profile = req.user;
        const result = await oauth_service_1.oauthService.handleOAuth(profile);
        ApiResponse_1.ApiResponse.ok(result, `${profile.provider} login successful`).send(res);
    },
};
//# sourceMappingURL=auth.controller.js.map