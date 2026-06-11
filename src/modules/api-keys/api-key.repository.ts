import { ApiKeyDocument, ApiKeyModel } from './api-key.model';

/* ------------------------------------------------------------------ */
// Types
/* ------------------------------------------------------------------ */

export interface CreateApiKeyInput {
  userId: string;
  name: string;
  publicId: string;
  keyHash: string;
  keyPrefix: string;
  role: string;
  scopes: string[];
  expiresAt: Date;
}

/* ------------------------------------------------------------------ */
// Repository
/* ------------------------------------------------------------------ */

export const apiKeyRepository = {
  /**
   * Create a new API key document. The plaintext key is never stored.
   */
  async create(data: CreateApiKeyInput): Promise<ApiKeyDocument> {
    return ApiKeyModel.create(data);
  },

  /**
   * Find a single API key by its public identifier.
   * Includes the hidden keyHash field for verification.
   */
  async findByPublicId(publicId: string): Promise<ApiKeyDocument | null> {
    return ApiKeyModel.findOne({ publicId }).select('+keyHash').lean();
  },

  /**
   * Find an active, non-expired API key by public ID.
   */
  async findActiveByPublicId(publicId: string): Promise<ApiKeyDocument | null> {
    return ApiKeyModel.findOne({
      publicId,
      isActive: true,
      expiresAt: { $gt: new Date() },
    })
      .select('+keyHash')
      .lean();
  },

  /**
   * List all API keys owned by a user.
   */
  async findByUserId(userId: string): Promise<ApiKeyDocument[]> {
    return ApiKeyModel.find({ userId }).sort({ createdAt: -1 }).lean();
  },

  /**
   * Count active API keys owned by a user.
   */
  async countActiveByUserId(userId: string): Promise<number> {
    return ApiKeyModel.countDocuments({ userId, isActive: true });
  },

  /**
   * Update the last used timestamp for an API key.
   */
  async updateLastUsed(id: string): Promise<void> {
    await ApiKeyModel.findByIdAndUpdate(id, { lastUsedAt: new Date() });
  },

  /**
   * Revoke an API key by marking it inactive.
   */
  async revoke(id: string): Promise<ApiKeyDocument | null> {
    return ApiKeyModel.findByIdAndUpdate(id, { isActive: false }, { new: true }).lean();
  },

  /**
   * Revoke an API key owned by a specific user.
   */
  async revokeByIdAndUserId(id: string, userId: string): Promise<ApiKeyDocument | null> {
    return ApiKeyModel.findOneAndUpdate(
      { _id: id, userId },
      { isActive: false },
      { new: true }
    ).lean();
  },

  /**
   * Delete an API key permanently. Used by tests and admin cleanup flows.
   */
  async deleteById(id: string): Promise<boolean> {
    const result = await ApiKeyModel.findByIdAndDelete(id);
    return result !== null;
  },
};
