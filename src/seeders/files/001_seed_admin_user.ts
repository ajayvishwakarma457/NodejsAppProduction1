import { Seeder } from '../seeder.types';
import { UserModel } from '../../modules/users/user.model';
import { logger } from '../../config/logger';

/**
 * Creates a default admin user if one does not already exist.
 * Idempotent: checks by email before creating.
 */
const seeder: Seeder = {
  name: '001_seed_admin_user',
  description: 'Create default admin user',
  environments: ['development', 'test', 'staging'],
  idempotent: true,
  async run({ environment }) {
    const adminEmail = `admin@${environment}.local`;
    const existing = await UserModel.findOne({ email: adminEmail }).lean();

    if (existing) {
      logger.info(`Admin user already exists: ${adminEmail}`);
      return;
    }

    await UserModel.create({
      firstName: 'Admin',
      lastName: 'User',
      email: adminEmail,
      password: 'Admin@123456',
      role: 'admin',
      isVerified: true,
      provider: 'local',
    });

    logger.info(`Created admin user: ${adminEmail}`);
  },
};

export default seeder;
