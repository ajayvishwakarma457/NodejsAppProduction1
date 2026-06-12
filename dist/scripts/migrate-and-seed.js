"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../config/db");
require("../config/env");
const logger_1 = require("../config/logger");
const migrations_1 = require("../migrations");
const seeders_1 = require("../seeders");
/**
 * Deployment helper: runs pending migrations, then runs pending seeders.
 * Safe to run on every deploy because both operations are idempotent.
 */
const main = async () => {
    try {
        await db_1.db.connect();
        const appliedMigrations = await migrations_1.migrationRunner.up({ direction: 'up' });
        if (appliedMigrations.length > 0) {
            console.log('Applied migrations:');
            appliedMigrations.forEach((name) => console.log(`  - ${name}`));
        }
        else {
            console.log('No pending migrations.');
        }
        const runSeeders = await seeders_1.seederRunner.run();
        if (runSeeders.length > 0) {
            console.log('Executed seeders:');
            runSeeders.forEach((name) => console.log(`  - ${name}`));
        }
        else {
            console.log('No pending seeders.');
        }
    }
    catch (error) {
        logger_1.logger.error('Migrate-and-seed failed', { error });
        process.exitCode = 1;
    }
    finally {
        await db_1.db.disconnect();
        process.exit(process.exitCode ?? 0);
    }
};
void main();
//# sourceMappingURL=migrate-and-seed.js.map