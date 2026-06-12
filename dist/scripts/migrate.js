"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../config/db");
const env_1 = require("../config/env");
const logger_1 = require("../config/logger");
const migrations_1 = require("../migrations");
const printUsage = () => {
    console.log(`
Usage: npm run db:migrate -- <command> [options]

Commands:
  up              Apply pending migrations
  down [steps]    Rollback the last batch or specified number of migrations
  status          Show applied and pending migrations
  reset           Rollback all migrations (development/test only)

Options:
  --dry-run       Simulate without writing to the database
  `);
};
const parseArgs = () => {
    const args = process.argv.slice(2);
    const command = args[0];
    const dryRun = args.includes('--dry-run');
    if (!command) {
        printUsage();
        process.exit(1);
    }
    const validCommands = ['up', 'down', 'status', 'reset'];
    if (!validCommands.includes(command)) {
        console.error(`Unknown command: ${command}`);
        printUsage();
        process.exit(1);
    }
    const stepsArg = args.find((arg, index) => index > 0 && !isNaN(Number(arg)));
    const steps = stepsArg ? Number(stepsArg) : undefined;
    return { command, steps, dryRun };
};
const main = async () => {
    const { command, steps, dryRun } = parseArgs();
    try {
        await db_1.db.connect();
        if (command === 'status') {
            const status = await migrations_1.migrationRunner.status();
            console.log('\nMigration Status:\n');
            console.table(status.map((s) => ({
                name: s.name,
                applied: s.applied ? 'Yes' : 'No',
                appliedAt: s.appliedAt ? s.appliedAt.toISOString() : '-',
                batch: s.batch ?? '-',
            })));
            return;
        }
        if (command === 'reset' && env_1.env.NODE_ENV === 'production') {
            console.error('Migration reset is not allowed in production');
            process.exit(1);
        }
        const options = { direction: command, steps, dryRun };
        let result = [];
        if (command === 'up') {
            result = await migrations_1.migrationRunner.up(options);
        }
        else if (command === 'down') {
            result = await migrations_1.migrationRunner.down(options);
        }
        else if (command === 'reset') {
            result = await migrations_1.migrationRunner.reset();
        }
        if (result.length === 0) {
            console.log('No migrations changed.');
        }
        else {
            console.log(`${command === 'up' ? 'Applied' : 'Rolled back'} migrations:`);
            result.forEach((name) => console.log(`  - ${name}`));
        }
    }
    catch (error) {
        logger_1.logger.error('Migration command failed', { error });
        process.exitCode = 1;
    }
    finally {
        await db_1.db.disconnect();
        process.exit(process.exitCode ?? 0);
    }
};
void main();
//# sourceMappingURL=migrate.js.map