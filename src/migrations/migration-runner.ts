import fs from 'fs/promises';
import path from 'path';
import mongoose, { ClientSession } from 'mongoose';
import { logger } from '../config/logger';
import { MigrationModel } from './migration.model';
import { migrationLock } from './migration-lock';
import {
  Migration,
  MigrationContext,
  MigrationOptions,
  MigrationStatus,
} from './migration.types';

const MIGRATIONS_DIR = path.join(__dirname, 'files');

const isTransactionError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes('transaction') ||
    message.includes('replica set') ||
    message.includes('multidocument') ||
    message.includes('sessions are not supported')
  );
};

const withTransaction = async <T>(
  operation: (session: ClientSession | null) => Promise<T>,
  dryRun: boolean
): Promise<T> => {
  if (dryRun) {
    return operation(null);
  }

  try {
    const session = await mongoose.connection.startSession();
    try {
      return await session.withTransaction(async (txnSession) => operation(txnSession));
    } finally {
      await session.endSession();
    }
  } catch (error) {
    if (isTransactionError(error)) {
      logger.warn(
        'MongoDB transactions unavailable (likely standalone server). Running migration without transaction.'
      );
      return operation(null);
    }
    throw error;
  }
};

const loadMigrationFiles = async (): Promise<Migration[]> => {
  let files: string[];
  try {
    files = await fs.readdir(MIGRATIONS_DIR);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }

  const migrations: Migration[] = [];
  const sortedFiles = files
    .filter((file) => file.endsWith('.ts') || file.endsWith('.js'))
    .sort();

  for (const file of sortedFiles) {
    const fullPath = path.join(MIGRATIONS_DIR, file);
    const module = (await import(fullPath)) as { default: Migration } | Migration;
    const migration = 'default' in module ? module.default : module;

    if (!migration.name || typeof migration.up !== 'function') {
      throw new Error(`Invalid migration file: ${file}`);
    }

    migrations.push({
      name: migration.name,
      description: migration.description,
      up: migration.up,
      down: migration.down ?? (async () => {}),
    });
  }

  return migrations;
};

const getNextBatch = async (): Promise<number> => {
  const last = await MigrationModel.findOne().sort({ batch: -1 }).select('batch').lean();
  return (last?.batch ?? 0) + 1;
};

export const migrationRunner = {
  /**
   * List all migration files and their applied status.
   */
  async status(): Promise<MigrationStatus[]> {
    const migrations = await loadMigrationFiles();
    const applied = await MigrationModel.find().sort({ name: 1 }).lean();
    const appliedMap = new Map(applied.map((m) => [m.name, m]));

    return migrations.map((migration) => {
      const record = appliedMap.get(migration.name);
      return {
        name: migration.name,
        applied: !!record,
        appliedAt: record?.appliedAt ?? null,
        batch: record?.batch ?? null,
      };
    });
  },

  /**
   * Apply pending migrations.
   */
  async up(options: MigrationOptions = { direction: 'up' }): Promise<string[]> {
    const acquired = await migrationLock.acquire();
    if (!acquired) {
      throw new Error('Unable to acquire migration lock. Another migration may be running.');
    }

    try {
      const migrations = await loadMigrationFiles();
      const appliedNames = new Set(
        (await MigrationModel.find().select('name').lean()).map((m) => m.name)
      );

      const pending = migrations.filter((m) => !appliedNames.has(m.name));
      if (pending.length === 0) {
        logger.info('No pending migrations');
        return [];
      }

      const batch = await getNextBatch();
      const applied: string[] = [];
      const limit = options.steps ?? pending.length;

      for (let i = 0; i < limit && i < pending.length; i++) {
        const migration = pending[i];
        logger.info(`Running migration: ${migration.name}`, {
          description: migration.description,
          dryRun: options.dryRun,
        });

        await withTransaction(async (session) => {
          const context: MigrationContext = {
            connection: mongoose.connection,
            session,
          };

          await migration.up(context);

          if (!options.dryRun) {
            await MigrationModel.create([{ name: migration.name, batch }], { session });
          }
        }, options.dryRun ?? false);

        applied.push(migration.name);
        logger.info(`Migration applied: ${migration.name}`);
      }

      logger.info(`Applied ${applied.length} migration(s)`, { batch });
      return applied;
    } finally {
      await migrationLock.release();
    }
  },

  /**
   * Rollback the most recent batch of migrations.
   */
  async down(options: MigrationOptions = { direction: 'down' }): Promise<string[]> {
    const acquired = await migrationLock.acquire();
    if (!acquired) {
      throw new Error('Unable to acquire migration lock. Another migration may be running.');
    }

    try {
      const lastBatchRecord = await MigrationModel.findOne().sort({ batch: -1 }).lean();
      if (!lastBatchRecord) {
        logger.info('No migrations to rollback');
        return [];
      }

      const migrations = await loadMigrationFiles();
      const migrationMap = new Map(migrations.map((m) => [m.name, m]));

      const applied = await MigrationModel.find({ batch: lastBatchRecord.batch })
        .sort({ appliedAt: -1 })
        .lean();

      const limit = options.steps ?? applied.length;
      const rolledBack: string[] = [];

      for (let i = 0; i < limit && i < applied.length; i++) {
        const record = applied[i];
        const migration = migrationMap.get(record.name);

        if (!migration) {
          throw new Error(
            `Cannot rollback ${record.name}: migration file not found. Restore the file or rollback manually.`
          );
        }

        logger.info(`Rolling back migration: ${record.name}`, { dryRun: options.dryRun });

        await withTransaction(async (session) => {
          const context: MigrationContext = {
            connection: mongoose.connection,
            session,
          };

          await migration.down(context);

          if (!options.dryRun) {
            await MigrationModel.deleteOne({ name: record.name }, session ? { session } : undefined);
          }
        }, options.dryRun ?? false);

        rolledBack.push(record.name);
        logger.info(`Migration rolled back: ${record.name}`);
      }

      logger.info(`Rolled back ${rolledBack.length} migration(s)`, {
        batch: lastBatchRecord.batch,
      });
      return rolledBack;
    } finally {
      await migrationLock.release();
    }
  },

  /**
   * Reset all migrations (dev/testing only).
   */
  async reset(): Promise<string[]> {
    const acquired = await migrationLock.acquire();
    if (!acquired) {
      throw new Error('Unable to acquire migration lock. Another migration may be running.');
    }

    try {
      const migrations = await loadMigrationFiles();
      const applied = await MigrationModel.find().sort({ appliedAt: -1 }).lean();
      const migrationMap = new Map(migrations.map((m) => [m.name, m]));
      const rolledBack: string[] = [];

      for (const record of applied) {
        const migration = migrationMap.get(record.name);
        if (!migration) {
          logger.warn(`Skipping rollback for missing migration: ${record.name}`);
          continue;
        }

        await withTransaction(async (session) => {
          const context: MigrationContext = {
            connection: mongoose.connection,
            session,
          };
          await migration.down(context);
          await MigrationModel.deleteOne({ name: record.name }, session ? { session } : undefined);
        }, false);

        rolledBack.push(record.name);
      }

      logger.info(`Reset ${rolledBack.length} migration(s)`);
      return rolledBack;
    } finally {
      await migrationLock.release();
    }
  },
};
