"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const _001_initialize_migration_tracking_1 = __importDefault(require("../../migrations/files/001_initialize_migration_tracking"));
const _002_ensure_application_indexes_1 = __importDefault(require("../../migrations/files/002_ensure_application_indexes"));
(0, vitest_1.describe)('migration files', () => {
    (0, vitest_1.it)('should export valid migration objects', () => {
        const migrations = [_001_initialize_migration_tracking_1.default, _002_ensure_application_indexes_1.default];
        for (const migration of migrations) {
            (0, vitest_1.expect)(migration).toHaveProperty('name');
            (0, vitest_1.expect)(typeof migration.name).toBe('string');
            (0, vitest_1.expect)(typeof migration.up).toBe('function');
            (0, vitest_1.expect)(typeof migration.down).toBe('function');
        }
    });
    (0, vitest_1.it)('should have unique migration names', () => {
        const names = [_001_initialize_migration_tracking_1.default.name, _002_ensure_application_indexes_1.default.name];
        const uniqueNames = new Set(names);
        (0, vitest_1.expect)(uniqueNames.size).toBe(names.length);
    });
});
//# sourceMappingURL=migration-files.test.js.map