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
exports.seederRunner = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("../config/logger");
const env_1 = require("../config/env");
const seeder_model_1 = require("./seeder.model");
const SEEDERS_DIR = path_1.default.join(__dirname, 'files');
const loadSeederFiles = async () => {
    let files;
    try {
        files = await promises_1.default.readdir(SEEDERS_DIR);
    }
    catch (error) {
        if (error.code === 'ENOENT') {
            return [];
        }
        throw error;
    }
    const seeders = [];
    const sortedFiles = files.filter((file) => file.endsWith('.ts') || file.endsWith('.js')).sort();
    for (const file of sortedFiles) {
        const fullPath = path_1.default.join(SEEDERS_DIR, file);
        const module = (await Promise.resolve(`${fullPath}`).then(s => __importStar(require(s))));
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
const getAllowedEnvironments = () => env_1.env.SEED_ALLOWED_ENVS;
const isSeedingAllowed = (environment) => {
    return getAllowedEnvironments().includes(environment.toLowerCase());
};
exports.seederRunner = {
    /**
     * List all seeder files and their run status.
     */
    async status(options = {}) {
        const seeders = await loadSeederFiles();
        const environment = options.environment ?? env_1.env.NODE_ENV;
        const records = await seeder_model_1.SeederModel.find({ environment }).sort({ name: 1 }).lean();
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
    async run(options = {}) {
        const environment = options.environment ?? env_1.env.NODE_ENV;
        if (!isSeedingAllowed(environment)) {
            throw new Error(`Seeding is not allowed in environment '${environment}'. ` +
                `Allowed environments: ${env_1.env.SEED_ALLOWED_ENVS.join(', ')}. ` +
                `Set SEED_ALLOWED_ENVS to override.`);
        }
        const seeders = await loadSeederFiles();
        if (seeders.length === 0) {
            logger_1.logger.info('No seeders found');
            return [];
        }
        const executedNames = new Set((await seeder_model_1.SeederModel.find({ environment }).select('name').lean()).map((r) => r.name));
        const pending = seeders.filter((seeder) => {
            if (seeder.environments && !seeder.environments.includes(environment)) {
                return false;
            }
            return !executedNames.has(seeder.name) || options.force;
        });
        if (pending.length === 0) {
            logger_1.logger.info('No pending seeders');
            return [];
        }
        const run = [];
        for (const seeder of pending) {
            logger_1.logger.info(`Running seeder: ${seeder.name}`, {
                description: seeder.description,
                environment,
                dryRun: options.dryRun,
            });
            const context = { environment };
            await seeder.run(context);
            if (!options.dryRun) {
                await seeder_model_1.SeederModel.findOneAndUpdate({ name: seeder.name, environment }, { $set: { runAt: new Date() } }, { upsert: true, new: true });
            }
            run.push(seeder.name);
            logger_1.logger.info(`Seeder completed: ${seeder.name}`);
        }
        logger_1.logger.info(`Ran ${run.length} seeder(s)`, { environment });
        return run;
    },
    /**
     * Clear all seeder tracking records for the current environment.
     * Does NOT delete seeded data; use this to re-run seeders.
     */
    async reset(options = {}) {
        const environment = options.environment ?? env_1.env.NODE_ENV;
        if (!isSeedingAllowed(environment)) {
            throw new Error(`Cannot reset seeders in environment '${environment}'`);
        }
        const result = await seeder_model_1.SeederModel.deleteMany({ environment });
        logger_1.logger.info(`Reset seeder tracking for environment '${environment}'`, {
            deleted: result.deletedCount,
        });
        return result.deletedCount ?? 0;
    },
};
//# sourceMappingURL=seeder-runner.js.map