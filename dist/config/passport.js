"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configurePassport = void 0;
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const passport_github2_1 = require("passport-github2");
const env_1 = require("./env");
const logger_1 = require("./logger");
const parseGoogleProfile = (accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails?.[0]?.value ?? '';
        const avatar = profile.photos?.[0]?.value ?? null;
        const result = {
            id: profile.id,
            email: email.toLowerCase().trim(),
            firstName: profile.name?.givenName || email.split('@')[0] || 'User',
            lastName: profile.name?.familyName || '',
            avatar,
            provider: 'google',
        };
        done(null, result);
    }
    catch (error) {
        logger_1.logger.error('Google OAuth profile parsing failed', { error });
        done(error);
    }
};
const parseGitHubProfile = (accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails?.[0]?.value ?? '';
        const avatar = profile.photos?.[0]?.value ?? null;
        const displayName = profile.displayName || profile.username || email.split('@')[0] || 'User';
        const nameParts = displayName.split(' ');
        const result = {
            id: profile.id,
            email: email.toLowerCase().trim(),
            firstName: nameParts[0] || 'User',
            lastName: nameParts.slice(1).join(' ') || '',
            avatar,
            provider: 'github',
        };
        done(null, result);
    }
    catch (error) {
        logger_1.logger.error('GitHub OAuth profile parsing failed', { error });
        done(error);
    }
};
const configurePassport = () => {
    if (env_1.env.GOOGLE_CLIENT_ID && env_1.env.GOOGLE_CLIENT_SECRET) {
        passport_1.default.use(new passport_google_oauth20_1.Strategy({
            clientID: env_1.env.GOOGLE_CLIENT_ID,
            clientSecret: env_1.env.GOOGLE_CLIENT_SECRET,
            callbackURL: env_1.env.GOOGLE_CALLBACK_URL,
            scope: ['profile', 'email'],
        }, parseGoogleProfile));
        logger_1.logger.info('Google OAuth strategy configured');
    }
    if (env_1.env.GITHUB_CLIENT_ID && env_1.env.GITHUB_CLIENT_SECRET) {
        passport_1.default.use(new passport_github2_1.Strategy({
            clientID: env_1.env.GITHUB_CLIENT_ID,
            clientSecret: env_1.env.GITHUB_CLIENT_SECRET,
            callbackURL: env_1.env.GITHUB_CALLBACK_URL,
            scope: ['user:email'],
        }, parseGitHubProfile));
        logger_1.logger.info('GitHub OAuth strategy configured');
    }
};
exports.configurePassport = configurePassport;
exports.default = passport_1.default;
//# sourceMappingURL=passport.js.map