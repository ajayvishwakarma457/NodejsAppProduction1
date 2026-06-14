"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const seeder_runner_1 = require("../../../seeders/seeder-runner");
vitest_1.vi.mock('fs/promises', () => ({
    default: {
        readdir: vitest_1.vi.fn().mockResolvedValue([]),
    },
}));
vitest_1.vi.mock('../../../seeders/seeder.model', () => ({
    SeederModel: {
        find: vitest_1.vi.fn().mockReturnValue({
            sort: vitest_1.vi.fn().mockReturnValue({
                lean: vitest_1.vi.fn().mockResolvedValue([]),
            }),
        }),
        findOneAndUpdate: vitest_1.vi.fn(),
        deleteMany: vitest_1.vi.fn(),
    },
}));
vitest_1.vi.mock('../../../config/env', () => ({
    env: {
        NODE_ENV: 'test',
        SEED_ALLOWED_ENVS: ['development', 'test', 'staging'],
    },
}));
(0, vitest_1.describe)('seederRunner', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('status', () => {
        (0, vitest_1.it)('should return empty status when no seeders are present', async () => {
            const status = await seeder_runner_1.seederRunner.status({ environment: 'test' });
            (0, vitest_1.expect)(status).toEqual([]);
        });
    });
    (0, vitest_1.describe)('run', () => {
        (0, vitest_1.it)('should reject seeding in disallowed environments', async () => {
            await (0, vitest_1.expect)(seeder_runner_1.seederRunner.run({ environment: 'production' })).rejects.toThrow("Seeding is not allowed in environment 'production'");
        });
        (0, vitest_1.it)('should return empty array when no seeders are found', async () => {
            const result = await seeder_runner_1.seederRunner.run({ environment: 'test' });
            (0, vitest_1.expect)(result).toEqual([]);
        });
    });
    (0, vitest_1.describe)('reset', () => {
        (0, vitest_1.it)('should reject reset in disallowed environments', async () => {
            await (0, vitest_1.expect)(seeder_runner_1.seederRunner.reset({ environment: 'production' })).rejects.toThrow("Cannot reset seeders in environment 'production'");
        });
    });
});
//# sourceMappingURL=seeder-runner.test.js.map