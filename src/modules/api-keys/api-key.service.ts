import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { env } from '../../config/env';
import { ApiError } from '../../utils/ApiError';
import { userRepository } from '../users/user.repository';
import { apiKeyRepository } from './api-key.repository';
import { ApiKeyDocument, ApiKeyScope, API_KEY_SCOPES } from './api-key.model';

/* ------------------------------------------------------------------ */
// Types
/* ------------------------------------------------------------------ */

export interface ApiKeyValidationResult {
  id: string;
  email: string;
  role: string;
  apiKeyId: string;
  scopes: ApiKeyScope[];
}

export interface ApiKeyCreationResult {
  apiKey: string;
  metadata: Omit<ApiKeyDocument, 'keyHash'>;
}

export interface CreateApiKeyOptions {
  name: string;
  role: string;
  scopes?: ApiKeyScope[];
  expiresInDays?: number;
}

/* ------------------------------------------------------------------ */
// Helpers
/* ------------------------------------------------------------------ */

const toBase64Url = (buffer: Buffer): string => {
  return buffer.toString('base64url').replace(/=+$/, '');
};

const generatePublicId = (): string => toBase64Url(randomBytes(16));

const generateSecret = (): string => toBase64Url(randomBytes(32));

const parseApiKey = (apiKey: string): { publicId: string; secret: string } | null => {
  const prefix = env.API_KEY_PREFIX;
  if (!apiKey.startsWith(prefix)) return null;

  const withoutPrefix = apiKey.slice(prefix.length);
  const separatorIndex = withoutPrefix.indexOf('_');
  if (separatorIndex === -1) return null;

  const publicId = withoutPrefix.slice(0, separatorIndex);
  const secret = withoutPrefix.slice(separatorIndex + 1);

  if (!publicId || !secret) return null;
  return { publicId, secret };
};

/* ------------------------------------------------------------------ */
// Service
/* ------------------------------------------------------------------ */

export const apiKeyService = {
  /**
   * Hash an API key using bcrypt. The cost factor is configurable via env.
   */
  async hashApiKey(apiKey: string): Promise<string> {
    return bcrypt.hash(apiKey, env.API_KEY_HASH_SALT_ROUNDS);
  },

  /**
   * Generate a new API key for a user. The plaintext key is returned exactly once.
   */
  async generateApiKey(
    userId: string,
    options: CreateApiKeyOptions
  ): Promise<ApiKeyCreationResult> {
    const activeCount = await apiKeyRepository.countActiveByUserId(userId);
    if (activeCount >= env.API_KEY_MAX_KEYS_PER_USER) {
      throw ApiError.conflict(
        `Maximum number of API keys (${env.API_KEY_MAX_KEYS_PER_USER}) reached. Revoke an existing key before creating a new one.`
      );
    }

    const publicId = generatePublicId();
    const secret = generateSecret();
    const apiKey = `${env.API_KEY_PREFIX}${publicId}_${secret}`;

    const keyHash = await this.hashApiKey(apiKey);
    const keyPrefix = apiKey.slice(0, 12);
    const expiresInDays = options.expiresInDays ?? env.API_KEY_DEFAULT_EXPIRY_DAYS;
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

    const scopes: ApiKeyScope[] = options.scopes?.length ? options.scopes : ['read', 'write'];
    const invalidScopes = scopes.filter((s) => !API_KEY_SCOPES.includes(s));
    if (invalidScopes.length > 0) {
      throw ApiError.badRequest(`Invalid API key scopes: ${invalidScopes.join(', ')}`);
    }

    const metadata = await apiKeyRepository.create({
      userId: userId as unknown as ApiKeyDocument['userId'],
      name: options.name,
      publicId,
      keyHash,
      keyPrefix,
      role: options.role as ApiKeyDocument['role'],
      scopes,
      expiresAt,
    });

    return { apiKey, metadata };
  },

  /**
   * Validate an API key and return the associated user context.
   * Returns null if the key is invalid, revoked, or expired.
   */
  async validateApiKey(apiKey: string): Promise<ApiKeyValidationResult | null> {
    const parsed = parseApiKey(apiKey);
    if (!parsed) return null;

    const apiKeyDoc = await apiKeyRepository.findActiveByPublicId(parsed.publicId);
    if (!apiKeyDoc) return null;

    const isValid = await bcrypt.compare(apiKey, apiKeyDoc.keyHash as string);
    if (!isValid) return null;

    const user = await userRepository.findById(String(apiKeyDoc.userId));
    if (!user) return null;

    // Update last used asynchronously; failures should not block authentication.
    apiKeyRepository
      .updateLastUsed(String((apiKeyDoc as Record<string, unknown>)._id))
      .catch(() => {
        // Best-effort tracking; swallow errors to keep requests resilient.
      });

    return {
      id: String(apiKeyDoc.userId),
      email: String(user.email),
      role: String(apiKeyDoc.role),
      apiKeyId: String((apiKeyDoc as Record<string, unknown>)._id),
      scopes: apiKeyDoc.scopes as ApiKeyScope[],
    };
  },

  /**
   * List all API keys owned by a user. Never includes the plaintext key or hash.
   */
  async listApiKeys(userId: string): Promise<ApiKeyDocument[]> {
    return apiKeyRepository.findByUserId(userId);
  },

  /**
   * Revoke an API key. Only the owner can revoke their own keys.
   */
  async revokeApiKey(userId: string, keyId: string): Promise<void> {
    const revoked = await apiKeyRepository.revokeByIdAndUserId(keyId, userId);
    if (!revoked) {
      throw ApiError.notFound('API key not found');
    }
  },
};
