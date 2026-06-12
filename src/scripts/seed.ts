import { db } from '../config/db';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { seederRunner } from '../seeders';

type Command = 'run' | 'status' | 'reset';

const printUsage = (): void => {
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

const parseArgs = (): { command: Command; dryRun: boolean; force: boolean; environment?: string } => {
  const args = process.argv.slice(2);
  const command = args[0] as Command;

  if (!command) {
    printUsage();
    process.exit(1);
  }

  const validCommands: Command[] = ['run', 'status', 'reset'];
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

const main = async (): Promise<void> => {
  const { command, dryRun, force, environment } = parseArgs();

  try {
    await db.connect();

    if (command === 'status') {
      const status = await seederRunner.status({ environment });
      console.log('\nSeeder Status:\n');
      console.table(
        status.map((s) => ({
          name: s.name,
          run: s.run ? 'Yes' : 'No',
          runAt: s.runAt ? s.runAt.toISOString() : '-',
          environment: s.environment ?? '-',
        }))
      );
      return;
    }

    if (command === 'reset' && env.NODE_ENV === 'production' && !environment) {
      console.error('Seeder reset is not allowed in production without --env override');
      process.exit(1);
    }

    let result: string[] | number = [];

    if (command === 'run') {
      result = await seederRunner.run({ dryRun, force, environment });
    } else if (command === 'reset') {
      result = await seederRunner.reset({ environment });
    }

    if (command === 'reset') {
      console.log(`Reset seeder tracking (${result as number} record(s)).`);
    } else if ((result as string[]).length === 0) {
      console.log('No seeders run.');
    } else {
      console.log('Executed seeders:');
      (result as string[]).forEach((name) => console.log(`  - ${name}`));
    }
  } catch (error) {
    logger.error('Seeder command failed', { error });
    process.exitCode = 1;
  } finally {
    await db.disconnect();
    process.exit(process.exitCode ?? 0);
  }
};

void main();
