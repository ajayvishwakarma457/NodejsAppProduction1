"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.oauthService = void 0;
const token_service_1 = require("../../services/token.service");
const user_repository_1 = require("../users/user.repository");
const auth_repository_1 = require("./auth.repository");
const auth_utils_1 = require("./auth.utils");
exports.oauthService = {
    /**
     * Handle OAuth login or registration.
     * If a user with the same email exists (local or other provider), link the OAuth account.
     * Otherwise, create a new user.
     */
    async handleOAuth(profile) {
        // 1. Try to find existing user by provider + providerId
        let user = await user_repository_1.userRepository.findByProvider(profile.provider, profile.id);
        if (user) {
            // Existing OAuth user — update avatar if changed, generate tokens
            if (profile.avatar && user.avatar !== profile.avatar) {
                await auth_repository_1.authRepository.updateById(String(user._id), {
                    avatar: profile.avatar,
                });
            }
            await auth_repository_1.authRepository.updateLastLogin(String(user._id));
            const tokens = await token_service_1.tokenService.generateTokenPair(String(user._id), String(user.email), String(user.role));
            return { user: (0, auth_utils_1.sanitizeAuthUser)(user), tokens };
        }
        // 2. Try to find existing user by email (link OAuth to local account)
        user = await user_repository_1.userRepository.findByEmail(profile.email);
        if (user) {
            // Link OAuth provider to existing account
            await auth_repository_1.authRepository.updateById(String(user._id), {
                provider: profile.provider,
                providerId: profile.id,
                avatar: profile.avatar || user.avatar,
            });
            const updatedUser = await user_repository_1.userRepository.findById(String(user._id));
            if (!updatedUser) {
                throw new Error('Failed to link OAuth account');
            }
            await auth_repository_1.authRepository.updateLastLogin(String(updatedUser._id));
            const tokens = await token_service_1.tokenService.generateTokenPair(String(updatedUser._id), String(updatedUser.email), String(updatedUser.role));
            return { user: (0, auth_utils_1.sanitizeAuthUser)(updatedUser), tokens };
        }
        // 3. Create new OAuth user
        const newUser = await auth_repository_1.authRepository.create({
            firstName: profile.firstName,
            lastName: profile.lastName,
            email: profile.email,
            avatar: profile.avatar,
            provider: profile.provider,
            providerId: profile.id,
            isVerified: true, // OAuth emails are pre-verified
        });
        const tokens = await token_service_1.tokenService.generateTokenPair(String(newUser._id), profile.email, String(newUser.role));
        return { user: (0, auth_utils_1.sanitizeAuthUser)(newUser), tokens };
    },
};
//# sourceMappingURL=oauth.service.js.map