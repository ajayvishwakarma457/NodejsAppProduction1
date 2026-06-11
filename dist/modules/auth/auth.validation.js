"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePasswordSchema = exports.refreshTokenSchema = exports.logoutSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
/* ------------------------------------------------------------------ */
// Body schemas
/* ------------------------------------------------------------------ */
exports.registerSchema = zod_1.z.object({
    body: zod_1.z.object({
        firstName: zod_1.z.string().min(1, 'First name is required').max(50),
        lastName: zod_1.z.string().min(1, 'Last name is required').max(50),
        email: zod_1.z.string().email('Valid email is required'),
        password: zod_1.z.string().min(6, 'Password must be at least 6 characters').max(100),
        avatar: zod_1.z.string().optional(),
    }),
});
exports.loginSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email('Valid email is required'),
        password: zod_1.z.string().min(1, 'Password is required'),
    }),
});
exports.logoutSchema = zod_1.z.object({
    body: zod_1.z.object({
        refreshToken: zod_1.z.string().optional(),
    }),
});
exports.refreshTokenSchema = zod_1.z.object({
    body: zod_1.z.object({
        refreshToken: zod_1.z.string().min(1, 'Refresh token is required'),
    }),
});
exports.changePasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        oldPassword: zod_1.z.string().min(1, 'Current password is required'),
        newPassword: zod_1.z.string().min(6, 'New password must be at least 6 characters').max(100),
    }),
});
//# sourceMappingURL=auth.validation.js.map