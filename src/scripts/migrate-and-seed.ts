import { db } from '../config/db';
import '../config/env';
import { logger } from '../config/logger';
import { migrationRunner } from '../migrations';
import { seederRunner } from '../seeders';

/**
 * Deployment helper: runs pending migrations, then runs pending seeders.
 * Safe to run on every deploy because both operations are idempotent.
 */
const main = async (): Promise<void> => {
  try {
    await db.connect();

    const appliedMigrations = await migrationRunner.up({ direction: 'up' });
    if (appliedMigrations.length > 0) {
      console.log('Applied migrations:');
      appliedMigrations.forEach((name) => console.log(`  - ${name}`));
    } else {
      console.log('No pending migrations.');
    }

    const runSeeders = await seederRunner.run();
    if (runSeeders.length > 0) {
      console.log('Executed seeders:');
      runSeeders.forEach((name) => console.log(`  - ${name}`));
    } else {
      console.log('No pending seeders.');
    }
  } catch (error) {
    logger.error('Migrate-and-seed failed', { error });
    process.exitCode = 1;
  } finally {
    await db.disconnect();
    process.exit(process.exitCode ?? 0);
  }
};

void main();
