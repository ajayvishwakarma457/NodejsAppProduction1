"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const _001_seed_admin_user_1 = __importDefault(require("../../../seeders/files/001_seed_admin_user"));
const _002_seed_demo_team_and_project_1 = __importDefault(require("../../../seeders/files/002_seed_demo_team_and_project"));
(0, vitest_1.describe)('seeder files', () => {
    (0, vitest_1.it)('should export valid seeder objects', () => {
        const seeders = [_001_seed_admin_user_1.default, _002_seed_demo_team_and_project_1.default];
        for (const seeder of seeders) {
            (0, vitest_1.expect)(seeder).toHaveProperty('name');
            (0, vitest_1.expect)(typeof seeder.name).toBe('string');
            (0, vitest_1.expect)(typeof seeder.run).toBe('function');
        }
    });
    (0, vitest_1.it)('should have unique seeder names', () => {
        const names = [_001_seed_admin_user_1.default.name, _002_seed_demo_team_and_project_1.default.name];
        const uniqueNames = new Set(names);
        (0, vitest_1.expect)(uniqueNames.size).toBe(names.length);
    });
    (0, vitest_1.it)('should restrict demo data seed to development and test', () => {
        (0, vitest_1.expect)(_001_seed_admin_user_1.default.environments).toContain('development');
        (0, vitest_1.expect)(_001_seed_admin_user_1.default.environments).toContain('test');
        (0, vitest_1.expect)(_002_seed_demo_team_and_project_1.default.environments).toContain('development');
        (0, vitest_1.expect)(_002_seed_demo_team_and_project_1.default.environments).toContain('test');
    });
});
//# sourceMappingURL=seeder-files.test.js.map