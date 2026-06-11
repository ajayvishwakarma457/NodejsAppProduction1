"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const ApiError_1 = require("../../utils/ApiError");
const token_service_1 = require("../../services/token.service");
const auth_repository_1 = require("./auth.repository");
const user_repository_1 = require("../users/user.repository");
const auth_utils_1 = require("./auth.utils");
exports.authService = {
    async register(data) {
        const email = String(data.email).toLowerCase().trim();
        const existing = await user_repository_1.userRepository.findByEmail(email);
        if (existing) {
            throw ApiError_1.ApiError.conflict('Email already registered');
        }
        const user = await auth_repository_1.authRepository.create({
            ...data,
            email,
        });
        const tokens = await token_service_1.tokenService.generateTokenPair(String(user._id), email, String(user.role));
        return {
            user: (0, auth_utils_1.sanitizeAuthUser)(user),
            tokens,
        };
    },
    async login(email, password) {
        const user = await auth_repository_1.authRepository.findByEmail(email);
        if (!user) {
            throw ApiError_1.ApiError.unauthorized('Invalid email or password');
        }
        if (!user.password) {
            throw ApiError_1.ApiError.badRequest('This account uses social login. Please sign in with Google or GitHub.');
        }
        const isPasswordValid = await bcryptjs_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            throw ApiError_1.ApiError.unauthorized('Invalid email or password');
        }
        await auth_repository_1.authRepository.updateLastLogin(String(user._id));
        const tokens = await token_service_1.tokenService.generateTokenPair(String(user._id), String(user.email), String(user.role));
        return {
            user: (0, auth_utils_1.sanitizeAuthUser)(user),
            tokens,
        };
    },
    async logout(accessToken, refreshToken) {
        await token_service_1.tokenService.blacklistAccessToken(accessToken);
        if (refreshToken) {
            try {
                const payload = token_service_1.tokenService.decodeToken(refreshToken);
                if (payload?.jti) {
                    await token_service_1.tokenService.revokeRefreshToken(payload.jti);
                }
            }
            catch {
                // Ignore invalid refresh token during logout
            }
        }
    },
    async refresh(refreshToken) {
        return token_service_1.tokenService.rotateRefreshToken(refreshToken);
    },
    async me(userId) {
        const user = await user_repository_1.userRepository.findById(userId);
        if (!user)
            return null;
        return (0, auth_utils_1.sanitizeAuthUser)(user);
    },
    async changePassword(userId, oldPassword, newPassword) {
        const user = await auth_repository_1.authRepository.findByEmail(String((await user_repository_1.userRepository.findById(userId))?.email ?? ''));
        if (!user) {
            throw ApiError_1.ApiError.notFound('User not found');
        }
        const isOldPasswordValid = await bcryptjs_1.default.compare(oldPassword, user.password);
        if (!isOldPasswordValid) {
            throw ApiError_1.ApiError.badRequest('Current password is incorrect');
        }
        await auth_repository_1.authRepository.updateById(userId, { password: newPassword });
    },
};
//# sourceMappingURL=auth.service.js.map