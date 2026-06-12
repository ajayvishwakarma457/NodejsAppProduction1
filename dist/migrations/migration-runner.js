"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrationRunner = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const mongoose_1 = __importDefault(require("mongoose"));
const logger_1 = require("../config/logger");
const migration_model_1 = require("./migration.model");
const migration_lock_1 = require("./migration-lock");
const MIGRATIONS_DIR = path_1.default.join(__dirname, 'files');
const isTransactionError = (error) => {
    if (!(error instanceof Error))
        return false;
    const message = error.message.toLowerCase();
    return (message.includes('transaction') ||
        message.includes('replica set') ||
        message.includes('multidocument') ||
        message.includes('sessions are not supported'));
};
const withTransaction = async (operation, dryRun) => {
    if (dryRun) {
        return operation(null);
    }
    try {
        const session = await mongoose_1.default.connection.startSession();
        try {
            return await session.withTransaction(async (txnSession) => operation(txnSession));
        }
        finally {
            await session.endSession();
        }
    }
    catch (error) {
        if (isTransactionError(error)) {
            logger_1.logger.warn('MongoDB transactions unavailable (likely standalone server). Running migration without transaction.');
            return operation(null);
        }
        throw error;
    }
};
const loadMigrationFiles = async () => {
    let files;
    try {
        files = await promises_1.default.readdir(MIGRATIONS_DIR);
    }
    catch (error) {
        if (error.code === 'ENOENT') {
            return [];
        }
        throw error;
    }
    const migrations = [];
    const sortedFiles = files
        .filter((file) => file.endsWith('.ts') || file.endsWith('.js'))
        .sort();
    for (const file of sortedFiles) {
        const fullPath = path_1.default.join(MIGRATIONS_DIR, file);
        const module = (await Promise.resolve(`${fullPath}`).then(s => __importStar(require(s))));
        const migration = 'default' in module ? module.default : module;
        if (!migration.name || typeof migration.up !== 'function') {
            throw new Error(`Invalid migration file: ${file}`);
        }
        migrations.push({
            name: migration.name,
            description: migration.description,
            up: migration.up,
            down: migration.down ?? (async () => { }),
        });
    }
    return migrations;
};
const getNextBatch = async () => {
    const last = await migration_model_1.MigrationModel.findOne().sort({ batch: -1 }).select('batch').lean();
    return (last?.batch ?? 0) + 1;
};
exports.migrationRunner = {
    /**
     * List all migration files and their applied status.
     */
    async status() {
        const migrations = await loadMigrationFiles();
        const applied = await migration_model_1.MigrationModel.find().sort({ name: 1 }).lean();
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
    async up(options = { direction: 'up' }) {
        const acquired = await migration_lock_1.migrationLock.acquire();
        if (!acquired) {
            throw new Error('Unable to acquire migration lock. Another migration may be running.');
        }
        try {
            const migrations = await loadMigrationFiles();
            const appliedNames = new Set((await migration_model_1.MigrationModel.find().select('name').lean()).map((m) => m.name));
            const pending = migrations.filter((m) => !appliedNames.has(m.name));
            if (pending.length === 0) {
                logger_1.logger.info('No pending migrations');
                return [];
            }
            const batch = await getNextBatch();
            const applied = [];
            const limit = options.steps ?? pending.length;
            for (let i = 0; i < limit && i < pending.length; i++) {
                const migration = pending[i];
                logger_1.logger.info(`Running migration: ${migration.name}`, {
                    description: migration.description,
                    dryRun: options.dryRun,
                });
                await withTransaction(async (session) => {
                    const context = {
                        connection: mongoose_1.default.connection,
                        session,
                    };
                    await migration.up(context);
                    if (!options.dryRun) {
                        await migration_model_1.MigrationModel.create([{ name: migration.name, batch }], { session });
                    }
                }, options.dryRun ?? false);
                applied.push(migration.name);
                logger_1.logger.info(`Migration applied: ${migration.name}`);
            }
            logger_1.logger.info(`Applied ${applied.length} migration(s)`, { batch });
            return applied;
        }
        finally {
            await migration_lock_1.migrationLock.release();
        }
    },
    /**
     * Rollback the most recent batch of migrations.
     */
    async down(options = { direction: 'down' }) {
        const acquired = await migration_lock_1.migrationLock.acquire();
        if (!acquired) {
            throw new Error('Unable to acquire migration lock. Another migration may be running.');
        }
        try {
            const lastBatchRecord = await migration_model_1.MigrationModel.findOne().sort({ batch: -1 }).lean();
            if (!lastBatchRecord) {
                logger_1.logger.info('No migrations to rollback');
                return [];
            }
            const migrations = await loadMigrationFiles();
            const migrationMap = new Map(migrations.map((m) => [m.name, m]));
            const applied = await migration_model_1.MigrationModel.find({ batch: lastBatchRecord.batch })
                .sort({ appliedAt: -1 })
                .lean();
            const limit = options.steps ?? applied.length;
            const rolledBack = [];
            for (let i = 0; i < limit && i < applied.length; i++) {
                const record = applied[i];
                const migration = migrationMap.get(record.name);
                if (!migration) {
                    throw new Error(`Cannot rollback ${record.name}: migration file not found. Restore the file or rollback manually.`);
                }
                logger_1.logger.info(`Rolling back migration: ${record.name}`, { dryRun: options.dryRun });
                await withTransaction(async (session) => {
                    const context = {
                        connection: mongoose_1.default.connection,
                        session,
                    };
                    await migration.down(context);
                    if (!options.dryRun) {
                        await migration_model_1.MigrationModel.deleteOne({ name: record.name }, session ? { session } : undefined);
                    }
                }, options.dryRun ?? false);
                rolledBack.push(record.name);
                logger_1.logger.info(`Migration rolled back: ${record.name}`);
            }
            logger_1.logger.info(`Rolled back ${rolledBack.length} migration(s)`, {
                batch: lastBatchRecord.batch,
            });
            return rolledBack;
        }
        finally {
            await migration_lock_1.migrationLock.release();
        }
    },
    /**
     * Reset all migrations (dev/testing only).
     */
    async reset() {
        const acquired = await migration_lock_1.migrationLock.acquire();
        if (!acquired) {
            throw new Error('Unable to acquire migration lock. Another migration may be running.');
        }
        try {
            const migrations = await loadMigrationFiles();
            const applied = await migration_model_1.MigrationModel.find().sort({ appliedAt: -1 }).lean();
            const migrationMap = new Map(migrations.map((m) => [m.name, m]));
            const rolledBack = [];
            for (const record of applied) {
                const migration = migrationMap.get(record.name);
                if (!migration) {
                    logger_1.logger.warn(`Skipping rollback for missing migration: ${record.name}`);
                    continue;
                }
                await withTransaction(async (session) => {
                    const context = {
                        connection: mongoose_1.default.connection,
                        session,
                    };
                    await migration.down(context);
                    await migration_model_1.MigrationModel.deleteOne({ name: record.name }, session ? { session } : undefined);
                }, false);
                rolledBack.push(record.name);
            }
            logger_1.logger.info(`Reset ${rolledBack.length} migration(s)`);
            return rolledBack;
        }
        finally {
            await migration_lock_1.migrationLock.release();
        }
    },
};
//# sourceMappingURL=migration-runner.js.map