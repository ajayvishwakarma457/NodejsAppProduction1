import { db } from '../config/db';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { migrationRunner } from '../migrations';

type Command = 'up' | 'down' | 'status' | 'reset';

const printUsage = (): void => {
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

const parseArgs = (): { command: Command; steps?: number; dryRun: boolean } => {
  const args = process.argv.slice(2);
  const command = args[0] as Command;
  const dryRun = args.includes('--dry-run');

  if (!command) {
    printUsage();
    process.exit(1);
  }

  const validCommands: Command[] = ['up', 'down', 'status', 'reset'];
  if (!validCommands.includes(command)) {
    console.error(`Unknown command: ${command}`);
    printUsage();
    process.exit(1);
  }

  const stepsArg = args.find((arg, index) => index > 0 && !isNaN(Number(arg)));
  const steps = stepsArg ? Number(stepsArg) : undefined;

  return { command, steps, dryRun };
};

const main = async (): Promise<void> => {
  const { command, steps, dryRun } = parseArgs();

  try {
    await db.connect();

    if (command === 'status') {
      const status = await migrationRunner.status();
      console.log('\nMigration Status:\n');
      console.table(
        status.map((s) => ({
          name: s.name,
          applied: s.applied ? 'Yes' : 'No',
          appliedAt: s.appliedAt ? s.appliedAt.toISOString() : '-',
          batch: s.batch ?? '-',
        }))
      );
      return;
    }

    if (command === 'reset' && env.NODE_ENV === 'production') {
      console.error('Migration reset is not allowed in production');
      process.exit(1);
    }

    const options = { direction: command as 'up' | 'down', steps, dryRun };
    let result: string[] = [];

    if (command === 'up') {
      result = await migrationRunner.up(options);
    } else if (command === 'down') {
      result = await migrationRunner.down(options);
    } else if (command === 'reset') {
      result = await migrationRunner.reset();
    }

    if (result.length === 0) {
      console.log('No migrations changed.');
    } else {
      console.log(`${command === 'up' ? 'Applied' : 'Rolled back'} migrations:`);
      result.forEach((name) => console.log(`  - ${name}`));
    }
  } catch (error) {
    logger.error('Migration command failed', { error });
    process.exitCode = 1;
  } finally {
    await db.disconnect();
    process.exit(process.exitCode ?? 0);
  }
};

void main();
