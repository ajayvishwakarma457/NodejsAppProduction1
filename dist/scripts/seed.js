"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../config/db");
const env_1 = require("../config/env");
const logger_1 = require("../config/logger");
const seeders_1 = require("../seeders");
const printUsage = () => {
    console.log(`
Usage: npm run db:seed -- <command> [options]

Commands:
  run             Run pending seeders
  status          Show executed and pending seeders
  reset           Clear seeder tracking (allows re-running)

Options:
  --dry-run       Simulate without writing to the database
  --force         Re-run seeders even if already executed
  --env           Override the environment (default: NODE_ENV)
  `);
};
const parseArgs = () => {
    const args = process.argv.slice(2);
    const command = args[0];
    if (!command) {
        printUsage();
        process.exit(1);
    }
    const validCommands = ['run', 'status', 'reset'];
    if (!validCommands.includes(command)) {
        console.error(`Unknown command: ${command}`);
        printUsage();
        process.exit(1);
    }
    const dryRun = args.includes('--dry-run');
    const force = args.includes('--force');
    const envIndex = args.indexOf('--env');
    const environment = envIndex !== -1 ? args[envIndex + 1] : undefined;
    return { command, dryRun, force, environment };
};
const main = async () => {
    const { command, dryRun, force, environment } = parseArgs();
    try {
        await db_1.db.connect();
        if (command === 'status') {
            const status = await seeders_1.seederRunner.status({ environment });
            console.log('\nSeeder Status:\n');
            console.table(status.map((s) => ({
                name: s.name,
                run: s.run ? 'Yes' : 'No',
                runAt: s.runAt ? s.runAt.toISOString() : '-',
                environment: s.environment ?? '-',
            })));
            return;
        }
        if (command === 'reset' && env_1.env.NODE_ENV === 'production' && !environment) {
            console.error('Seeder reset is not allowed in production without --env override');
            process.exit(1);
        }
        let result = [];
        if (command === 'run') {
            result = await seeders_1.seederRunner.run({ dryRun, force, environment });
        }
        else if (command === 'reset') {
            result = await seeders_1.seederRunner.reset({ environment });
        }
        if (command === 'reset') {
            console.log(`Reset seeder tracking (${result} record(s)).`);
        }
        else if (result.length === 0) {
            console.log('No seeders run.');
        }
        else {
            console.log('Executed seeders:');
            result.forEach((name) => console.log(`  - ${name}`));
        }
    }
    catch (error) {
        logger_1.logger.error('Seeder command failed', { error });
        process.exitCode = 1;
    }
    finally {
        await db_1.db.disconnect();
        process.exit(process.exitCode ?? 0);
    }
};
void main();
//# sourceMappingURL=seed.js.map