import fs from 'fs/promises';
import path from 'path';
import { logger } from '../config/logger';
import { env } from '../config/env';
import { SeederModel } from './seeder.model';
import { Seeder, SeederContext, SeederOptions, SeederStatus } from './seeder.types';

const SEEDERS_DIR = path.join(__dirname, 'files');

const loadSeederFiles = async (): Promise<Seeder[]> => {
  let files: string[];
  try {
    files = await fs.readdir(SEEDERS_DIR);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }

  const seeders: Seeder[] = [];
  const sortedFiles = files
    .filter((file) => file.endsWith('.ts') || file.endsWith('.js'))
    .sort();

  for (const file of sortedFiles) {
    const fullPath = path.join(SEEDERS_DIR, file);
    const module = (await import(fullPath)) as { default: Seeder } | Seeder;
    const seeder = 'default' in module ? module.default : module;

    if (!seeder.name || typeof seeder.run !== 'function') {
      throw new Error(`Invalid seeder file: ${file}`);
    }

    seeders.push({
      name: seeder.name,
      description: seeder.description,
      environments: seeder.environments,
      idempotent: seeder.idempotent ?? true,
      run: seeder.run,
    });
  }

  return seeders;
};

const getAllowedEnvironments = (): string[] => env.SEED_ALLOWED_ENVS;

const isSeedingAllowed = (environment: string): boolean => {
  return getAllowedEnvironments().includes(environment.toLowerCase());
};

export const seederRunner = {
  /**
   * List all seeder files and their run status.
   */
  async status(options: SeederOptions = {}): Promise<SeederStatus[]> {
    const seeders = await loadSeederFiles();
    const environment = options.environment ?? env.NODE_ENV;
    const records = await SeederModel.find({ environment }).sort({ name: 1 }).lean();
    const recordMap = new Map(records.map((r) => [r.name, r]));

    return seeders.map((seeder) => {
      const record = recordMap.get(seeder.name);
      return {
        name: seeder.name,
        run: !!record,
        runAt: record?.runAt ?? null,
        environment: record?.environment ?? null,
      };
    });
  },

  /**
   * Run pending seeders for the current environment.
   */
  async run(options: SeederOptions = {}): Promise<string[]> {
    const environment = options.environment ?? env.NODE_ENV;

    if (!isSeedingAllowed(environment)) {
      throw new Error(
        `Seeding is not allowed in environment '${environment}'. ` +
          `Allowed environments: ${env.SEED_ALLOWED_ENVS.join(', ')}. ` +
          `Set SEED_ALLOWED_ENVS to override.`
      );
    }

    const seeders = await loadSeederFiles();
    if (seeders.length === 0) {
      logger.info('No seeders found');
      return [];
    }

    const executedNames = new Set(
      (await SeederModel.find({ environment }).select('name').lean()).map((r) => r.name)
    );

    const pending = seeders.filter((seeder) => {
      if (seeder.environments && !seeder.environments.includes(environment)) {
        return false;
      }
      return !executedNames.has(seeder.name) || options.force;
    });

    if (pending.length === 0) {
      logger.info('No pending seeders');
      return [];
    }

    const run: string[] = [];

    for (const seeder of pending) {
      logger.info(`Running seeder: ${seeder.name}`, {
        description: seeder.description,
        environment,
        dryRun: options.dryRun,
      });

      const context: SeederContext = { environment };
      await seeder.run(context);

      if (!options.dryRun) {
        await SeederModel.findOneAndUpdate(
          { name: seeder.name, environment },
          { $set: { runAt: new Date() } },
          { upsert: true, new: true }
        );
      }

      run.push(seeder.name);
      logger.info(`Seeder completed: ${seeder.name}`);
    }

    logger.info(`Ran ${run.length} seeder(s)`, { environment });
    return run;
  },

  /**
   * Clear all seeder tracking records for the current environment.
   * Does NOT delete seeded data; use this to re-run seeders.
   */
  async reset(options: SeederOptions = {}): Promise<number> {
    const environment = options.environment ?? env.NODE_ENV;

    if (!isSeedingAllowed(environment)) {
      throw new Error(`Cannot reset seeders in environment '${environment}'`);
    }

    const result = await SeederModel.deleteMany({ environment });
    logger.info(`Reset seeder tracking for environment '${environment}'`, {
      deleted: result.deletedCount,
    });
    return result.deletedCount ?? 0;
  },
};
