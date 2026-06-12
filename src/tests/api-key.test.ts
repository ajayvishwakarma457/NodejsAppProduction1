import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { apiKeyService } from '../modules/api-keys/api-key.service';
import { apiKeyRepository } from '../modules/api-keys/api-key.repository';
import { userRepository } from '../modules/users/user.repository';
import { redisService } from '../services/redis.service';
import { ApiError } from '../utils/ApiError';

vi.mock('../modules/api-keys/api-key.repository', () => ({
  apiKeyRepository: {
    create: vi.fn(),
    findActiveByPublicId: vi.fn(),
    findByUserId: vi.fn(),
    countActiveByUserId: vi.fn(),
    updateLastUsed: vi.fn().mockResolvedValue(undefined),
    revokeByIdAndUserId: vi.fn(),
  },
}));

vi.mock('../modules/users/user.repository', () => ({
  userRepository: {
    findById: vi.fn(),
  },
}));

const mockedApiKeyRepository = vi.mocked(apiKeyRepository);
const mockedUserRepository = vi.mocked(userRepository);

describe('apiKeyService', () => {
  beforeAll(async () => {
    await redisService.connect();
  });

  afterAll(async () => {
    await redisService.disconnect();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateApiKey', () => {
    it('should generate a prefixed API key and create a hashed document', async () => {
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
      } as any);

      const result = await apiKeyService.generateApiKey('user-1', {
        name: 'Test Key',
        role: 'member',
      });

      expect(result.apiKey).toMatch(/^npak_[A-Za-z0-9_-]+_[A-Za-z0-9_-]+$/);
      expect(result.metadata.userId).toBe('user-1');
      expect(mockedApiKeyRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          name: 'Test Key',
          role: 'member',
          scopes: ['read', 'write'],
        })
      );
      expect((mockedApiKeyRepository.create.mock.calls[0][0] as any).keyHash).toMatch(
        /^\$2[aby]\$/
      );
    });

    it('should reject creation when the user has reached the key limit', async () => {
      mockedApiKeyRepository.countActiveByUserId.mockResolvedValue(10);

      await expect(
        apiKeyService.generateApiKey('user-1', {
          name: 'Too Many',
          role: 'member',
        })
      ).rejects.toThrow(ApiError);

      expect(mockedApiKeyRepository.create).not.toHaveBeenCalled();
    });

    it('should reject invalid scopes', async () => {
      mockedApiKeyRepository.countActiveByUserId.mockResolvedValue(0);

      await expect(
        apiKeyService.generateApiKey('user-1', {
          name: 'Bad Scope',
          role: 'member',
          scopes: ['read', 'delete'] as any,
        })
      ).rejects.toThrow('Invalid API key scopes');
    });
  });

  describe('validateApiKey', () => {
    it('should return user context for a valid active key', async () => {
      const apiKey = await apiKeyService.generateApiKey('user-1', {
        name: 'Valid Key',
        role: 'admin',
        scopes: ['read'],
      });

      mockedApiKeyRepository.findActiveByPublicId.mockResolvedValue({
        _id: 'key-id-1',
        userId: 'user-1',
        publicId: 'pubid',
        keyHash: (mockedApiKeyRepository.create.mock.calls[0][0] as any).keyHash,
        role: 'admin',
        scopes: ['read'],
        expiresAt: new Date('2099-01-01'),
        isActive: true,
      } as any);

      mockedUserRepository.findById.mockResolvedValue({
        _id: 'user-1',
        email: 'a@example.com',
      } as any);

      const result = await apiKeyService.validateApiKey(apiKey.apiKey);

      expect(result).not.toBeNull();
      expect(result?.id).toBe('user-1');
      expect(result?.email).toBe('a@example.com');
      expect(result?.role).toBe('admin');
      expect(result?.scopes).toEqual(['read']);
      expect(mockedApiKeyRepository.updateLastUsed).toHaveBeenCalled();
    });

    it('should return null for an invalid key format', async () => {
      const result = await apiKeyService.validateApiKey('not-an-api-key');
      expect(result).toBeNull();
    });

    it('should return null when the key is not found', async () => {
      const apiKey = await apiKeyService.generateApiKey('user-1', {
        name: 'Missing Key',
        role: 'member',
      });

      mockedApiKeyRepository.findActiveByPublicId.mockResolvedValue(null);

      const result = await apiKeyService.validateApiKey(apiKey.apiKey);
      expect(result).toBeNull();
    });

    it('should return null when the hash does not match', async () => {
      const apiKey = await apiKeyService.generateApiKey('user-1', {
        name: 'Tampered Key',
        role: 'member',
      });

      mockedApiKeyRepository.findActiveByPublicId.mockResolvedValue({
        _id: 'key-id-1',
        userId: 'user-1',
        publicId: 'pubid',
        keyHash: await apiKeyService.hashApiKey('npak_pubid_differentsecret'),
        role: 'member',
        scopes: ['read'],
        expiresAt: new Date('2099-01-01'),
        isActive: true,
      } as any);

      const result = await apiKeyService.validateApiKey(apiKey.apiKey);
      expect(result).toBeNull();
    });

    it('should return null when the owning user no longer exists', async () => {
      const apiKey = await apiKeyService.generateApiKey('user-1', {
        name: 'Orphan Key',
        role: 'member',
      });

      mockedApiKeyRepository.findActiveByPublicId.mockResolvedValue({
        _id: 'key-id-1',
        userId: 'user-1',
        publicId: 'pubid',
        keyHash: (mockedApiKeyRepository.create.mock.calls[0][0] as any).keyHash,
        role: 'member',
        scopes: ['read'],
        expiresAt: new Date('2099-01-01'),
        isActive: true,
      } as any);

      mockedUserRepository.findById.mockResolvedValue(null);

      const result = await apiKeyService.validateApiKey(apiKey.apiKey);
      expect(result).toBeNull();
    });
  });

  describe('listApiKeys', () => {
    it('should return keys owned by the user', async () => {
      const keys = [{ _id: 'key-1' }, { _id: 'key-2' }] as any;
      mockedApiKeyRepository.findByUserId.mockResolvedValue(keys);

      const result = await apiKeyService.listApiKeys('user-1');
      expect(result).toHaveLength(2);
      expect(mockedApiKeyRepository.findByUserId).toHaveBeenCalledWith('user-1');
    });
  });

  describe('revokeApiKey', () => {
    it('should revoke a key owned by the user', async () => {
      mockedApiKeyRepository.revokeByIdAndUserId.mockResolvedValue(true);

      await apiKeyService.revokeApiKey('user-1', 'key-1');
      expect(mockedApiKeyRepository.revokeByIdAndUserId).toHaveBeenCalledWith('key-1', 'user-1');
    });

    it('should throw not found when the key does not belong to the user', async () => {
      mockedApiKeyRepository.revokeByIdAndUserId.mockResolvedValue(false);

      await expect(apiKeyService.revokeApiKey('user-1', 'key-1')).rejects.toThrow(ApiError);
    });
  });
});
