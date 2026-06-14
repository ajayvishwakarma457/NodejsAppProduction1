"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const api_key_service_1 = require("../../modules/api-keys/api-key.service");
const api_key_repository_1 = require("../../modules/api-keys/api-key.repository");
const user_repository_1 = require("../../modules/users/user.repository");
const redis_service_1 = require("../../services/redis.service");
const ApiError_1 = require("../../utils/ApiError");
vitest_1.vi.mock('../../modules/api-keys/api-key.repository', () => ({
    apiKeyRepository: {
        create: vitest_1.vi.fn(),
        findActiveByPublicId: vitest_1.vi.fn(),
        findByUserId: vitest_1.vi.fn(),
        countActiveByUserId: vitest_1.vi.fn(),
        updateLastUsed: vitest_1.vi.fn().mockResolvedValue(undefined),
        revokeByIdAndUserId: vitest_1.vi.fn(),
    },
}));
vitest_1.vi.mock('../../modules/users/user.repository', () => ({
    userRepository: {
        findById: vitest_1.vi.fn(),
    },
}));
const mockedApiKeyRepository = vitest_1.vi.mocked(api_key_repository_1.apiKeyRepository);
const mockedUserRepository = vitest_1.vi.mocked(user_repository_1.userRepository);
(0, vitest_1.describe)('apiKeyService', () => {
    (0, vitest_1.beforeAll)(async () => {
        await redis_service_1.redisService.connect();
    });
    (0, vitest_1.afterAll)(async () => {
        await redis_service_1.redisService.disconnect();
    });
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('generateApiKey', () => {
        (0, vitest_1.it)('should generate a prefixed API key and create a hashed document', async () => {
            mockedApiKeyRepository.countActiveByUserId.mockResolvedValue(0);
            mockedApiKeyRepository.create.mockResolvedValue({
                _id: 'key-id-1',
                userId: 'user-1',
                name: 'Test Key',
                publicId: 'pubid',
                keyPrefix: 'npak_pubid_',
                role: 'member',
                scopes: ['read', 'write'],
                expiresAt: new Date('2099-01-01'),
                lastUsedAt: null,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            const result = await api_key_service_1.apiKeyService.generateApiKey('user-1', {
                name: 'Test Key',
                role: 'member',
            });
            (0, vitest_1.expect)(result.apiKey).toMatch(/^npak_[A-Za-z0-9_-]+_[A-Za-z0-9_-]+$/);
            (0, vitest_1.expect)(result.metadata.userId).toBe('user-1');
            (0, vitest_1.expect)(mockedApiKeyRepository.create).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                userId: 'user-1',
                name: 'Test Key',
                role: 'member',
                scopes: ['read', 'write'],
            }));
            (0, vitest_1.expect)(mockedApiKeyRepository.create.mock.calls[0][0].keyHash).toMatch(/^\$2[aby]\$/);
        });
        (0, vitest_1.it)('should reject creation when the user has reached the key limit', async () => {
            mockedApiKeyRepository.countActiveByUserId.mockResolvedValue(10);
            await (0, vitest_1.expect)(api_key_service_1.apiKeyService.generateApiKey('user-1', {
                name: 'Too Many',
                role: 'member',
            })).rejects.toThrow(ApiError_1.ApiError);
            (0, vitest_1.expect)(mockedApiKeyRepository.create).not.toHaveBeenCalled();
        });
        (0, vitest_1.it)('should reject invalid scopes', async () => {
            mockedApiKeyRepository.countActiveByUserId.mockResolvedValue(0);
            await (0, vitest_1.expect)(api_key_service_1.apiKeyService.generateApiKey('user-1', {
                name: 'Bad Scope',
                role: 'member',
                scopes: ['read', 'delete'],
            })).rejects.toThrow('Invalid API key scopes');
        });
    });
    (0, vitest_1.describe)('validateApiKey', () => {
        (0, vitest_1.it)('should return user context for a valid active key', async () => {
            const apiKey = await api_key_service_1.apiKeyService.generateApiKey('user-1', {
                name: 'Valid Key',
                role: 'admin',
                scopes: ['read'],
            });
            mockedApiKeyRepository.findActiveByPublicId.mockResolvedValue({
                _id: 'key-id-1',
                userId: 'user-1',
                publicId: 'pubid',
                keyHash: mockedApiKeyRepository.create.mock.calls[0][0].keyHash,
                role: 'admin',
                scopes: ['read'],
                expiresAt: new Date('2099-01-01'),
                isActive: true,
            });
            mockedUserRepository.findById.mockResolvedValue({
                _id: 'user-1',
                email: 'a@example.com',
            });
            const result = await api_key_service_1.apiKeyService.validateApiKey(apiKey.apiKey);
            (0, vitest_1.expect)(result).not.toBeNull();
            (0, vitest_1.expect)(result?.id).toBe('user-1');
            (0, vitest_1.expect)(result?.email).toBe('a@example.com');
            (0, vitest_1.expect)(result?.role).toBe('admin');
            (0, vitest_1.expect)(result?.scopes).toEqual(['read']);
            (0, vitest_1.expect)(mockedApiKeyRepository.updateLastUsed).toHaveBeenCalled();
        });
        (0, vitest_1.it)('should return null for an invalid key format', async () => {
            const result = await api_key_service_1.apiKeyService.validateApiKey('not-an-api-key');
            (0, vitest_1.expect)(result).toBeNull();
        });
        (0, vitest_1.it)('should return null when the key is not found', async () => {
            const apiKey = await api_key_service_1.apiKeyService.generateApiKey('user-1', {
                name: 'Missing Key',
                role: 'member',
            });
            mockedApiKeyRepository.findActiveByPublicId.mockResolvedValue(null);
            const result = await api_key_service_1.apiKeyService.validateApiKey(apiKey.apiKey);
            (0, vitest_1.expect)(result).toBeNull();
        });
        (0, vitest_1.it)('should return null when the hash does not match', async () => {
            const apiKey = await api_key_service_1.apiKeyService.generateApiKey('user-1', {
                name: 'Tampered Key',
                role: 'member',
            });
            mockedApiKeyRepository.findActiveByPublicId.mockResolvedValue({
                _id: 'key-id-1',
                userId: 'user-1',
                publicId: 'pubid',
                keyHash: await api_key_service_1.apiKeyService.hashApiKey('npak_pubid_differentsecret'),
                role: 'member',
                scopes: ['read'],
                expiresAt: new Date('2099-01-01'),
                isActive: true,
            });
            const result = await api_key_service_1.apiKeyService.validateApiKey(apiKey.apiKey);
            (0, vitest_1.expect)(result).toBeNull();
        });
        (0, vitest_1.it)('should return null when the owning user no longer exists', async () => {
            const apiKey = await api_key_service_1.apiKeyService.generateApiKey('user-1', {
                name: 'Orphan Key',
                role: 'member',
            });
            mockedApiKeyRepository.findActiveByPublicId.mockResolvedValue({
                _id: 'key-id-1',
                userId: 'user-1',
                publicId: 'pubid',
                keyHash: mockedApiKeyRepository.create.mock.calls[0][0].keyHash,
                role: 'member',
                scopes: ['read'],
                expiresAt: new Date('2099-01-01'),
                isActive: true,
            });
            mockedUserRepository.findById.mockResolvedValue(null);
            const result = await api_key_service_1.apiKeyService.validateApiKey(apiKey.apiKey);
            (0, vitest_1.expect)(result).toBeNull();
        });
    });
    (0, vitest_1.describe)('listApiKeys', () => {
        (0, vitest_1.it)('should return keys owned by the user', async () => {
            const keys = [{ _id: 'key-1' }, { _id: 'key-2' }];
            mockedApiKeyRepository.findByUserId.mockResolvedValue(keys);
            const result = await api_key_service_1.apiKeyService.listApiKeys('user-1');
            (0, vitest_1.expect)(result).toHaveLength(2);
            (0, vitest_1.expect)(mockedApiKeyRepository.findByUserId).toHaveBeenCalledWith('user-1');
        });
    });
    (0, vitest_1.describe)('revokeApiKey', () => {
        (0, vitest_1.it)('should revoke a key owned by the user', async () => {
            mockedApiKeyRepository.revokeByIdAndUserId.mockResolvedValue(true);
            await api_key_service_1.apiKeyService.revokeApiKey('user-1', 'key-1');
            (0, vitest_1.expect)(mockedApiKeyRepository.revokeByIdAndUserId).toHaveBeenCalledWith('key-1', 'user-1');
        });
        (0, vitest_1.it)('should throw not found when the key does not belong to the user', async () => {
            mockedApiKeyRepository.revokeByIdAndUserId.mockResolvedValue(false);
            await (0, vitest_1.expect)(api_key_service_1.apiKeyService.revokeApiKey('user-1', 'key-1')).rejects.toThrow(ApiError_1.ApiError);
        });
    });
});
//# sourceMappingURL=api-key.test.js.map