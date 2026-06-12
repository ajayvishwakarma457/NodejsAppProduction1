"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const user_model_1 = require("../../modules/users/user.model");
const logger_1 = require("../../config/logger");
/**
 * Creates a default admin user if one does not already exist.
 * Idempotent: checks by email before creating.
 */
const seeder = {
    name: '001_seed_admin_user',
    description: 'Create default admin user',
    environments: ['development', 'test', 'staging'],
    idempotent: true,
    async run({ environment }) {
        const adminEmail = `admin@${environment}.local`;
        const existing = await user_model_1.UserModel.findOne({ email: adminEmail }).lean();
        if (existing) {
            logger_1.logger.info(`Admin user already exists: ${adminEmail}`);
            return;
        }
        await user_model_1.UserModel.create({
            firstName: 'Admin',
            lastName: 'User',
            email: adminEmail,
            password: 'Admin@123456',
            role: 'admin',
            isVerified: true,
            provider: 'local',
        });
        logger_1.logger.info(`Created admin user: ${adminEmail}`);
    },
};
exports.default = seeder;
//# sourceMappingURL=001_seed_admin_user.js.map