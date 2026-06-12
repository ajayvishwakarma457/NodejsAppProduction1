import mongoose from 'mongoose';
import { logger } from '../config/logger';

export interface IndexInfo {
  name: string;
  key: Record<string, number | string>;
  unique?: boolean;
  sparse?: boolean;
  expireAfterSeconds?: number;
}

export interface CollectionIndexStatus {
  collection: string;
  indexCount: number;
  indexes: IndexInfo[];
  ready: boolean;
  error?: string;
}

export interface MissingIndexRecommendation {
  collection: string;
  field: string;
  reason: string;
  suggestedIndex: Record<string, number | string>;
}

/**
 * List all indexes for a given collection.
 */
export const listCollectionIndexes = async (collectionName: string): Promise<IndexInfo[]> => {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection not available');
  }

  const rawIndexes = await db.collection(collectionName).indexes();
  return rawIndexes.map((idx) => ({
    name: idx.name ?? 'unknown',
    key: idx.key as Record<string, number | string>,
    unique: idx.unique,
    sparse: idx.sparse,
    expireAfterSeconds: idx.expireAfterSeconds,
  }));
};

/**
 * List indexes for all collections in the current database.
 */
export const listAllIndexes = async (): Promise<CollectionIndexStatus[]> => {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection not available');
  }

  const collections = await db.listCollections().toArray();
  const results: CollectionIndexStatus[] = [];

  for (const collection of collections) {
    try {
      const indexes = await listCollectionIndexes(collection.name);
      results.push({
        collection: collection.name,
        indexCount: indexes.length,
        indexes,
        ready: true,
      });
    } catch (error) {
      results.push({
        collection: collection.name,
        indexCount: 0,
        indexes: [],
        ready: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
};

/**
 * Ensure Mongoose model indexes are built.
 * Call this once at startup or via a maintenance job.
 */
export const ensureModelIndexes = async (): Promise<void> => {
  for (const model of mongoose.modelNames()) {
    try {
      await mongoose.model(model).syncIndexes();
      logger.info(`Synced indexes for model: ${model}`);
    } catch (error) {
      logger.error(`Failed to sync indexes for model: ${model}`, { error });
    }
  }
};

/**
 * Heuristic recommendations for missing indexes based on common query patterns.
 * This is a starting point; use MongoDB profiling and $indexStats for real-world tuning.
 */
export const getMissingIndexRecommendations = (): MissingIndexRecommendation[] => {
  const recommendations: MissingIndexRecommendation[] = [
    {
      collection: 'users',
      field: 'email',
      reason: 'Login and uniqueness checks',
      suggestedIndex: { email: 1 },
    },
    {
      collection: 'teams',
      field: 'ownerId + members.userId',
      reason: 'Team ownership and membership lookups',
      suggestedIndex: { ownerId: 1, 'members.userId': 1 },
    },
    {
      collection: 'projects',
      field: 'teamId + status',
      reason: 'Team project dashboards filtered by status',
      suggestedIndex: { teamId: 1, status: 1 },
    },
    {
      collection: 'tasks',
      field: 'assignedTo + status + priority',
      reason: 'User task boards with status/priority filters',
      suggestedIndex: { assignedTo: 1, status: 1, priority: 1 },
    },
    {
      collection: 'comments',
      field: 'taskId + createdAt',
      reason: 'Task comment threads',
      suggestedIndex: { taskId: 1, createdAt: -1 },
    },
    {
      collection: 'notifications',
      field: 'userId + isRead + createdAt',
      reason: 'User notification feeds',
      suggestedIndex: { userId: 1, isRead: 1, createdAt: -1 },
    },
    {
      collection: 'apikeys',
      field: 'publicId',
      reason: 'API key validation',
      suggestedIndex: { publicId: 1 },
    },
  ];

  return recommendations;
};

/**
 * Check whether the recommended indexes exist.
 */
export const checkRecommendedIndexes = async (): Promise<MissingIndexRecommendation[]> => {
  const recommendations = getMissingIndexRecommendations();
  const missing: MissingIndexRecommendation[] = [];

  for (const rec of recommendations) {
    try {
      const indexes = await listCollectionIndexes(rec.collection);
      const hasIndex = indexes.some((idx) => {
        const keys = Object.keys(idx.key);
        const suggestedKeys = Object.keys(rec.suggestedIndex);
        if (keys.length < suggestedKeys.length) return false;
        return suggestedKeys.every((k) => idx.key[k] === rec.suggestedIndex[k]);
      });

      if (!hasIndex) {
        missing.push(rec);
      }
    } catch {
      missing.push(rec);
    }
  }

  return missing;
};

/**
 * Get a high-level index health report.
 */
export const getIndexHealthReport = async (): Promise<{
  healthy: boolean;
  collections: CollectionIndexStatus[];
  missingRecommendations: MissingIndexRecommendation[];
}> => {
  const collections = await listAllIndexes();
  const missingRecommendations = await checkRecommendedIndexes();
  const healthy = collections.every((c) => c.ready) && missingRecommendations.length === 0;

  return {
    healthy,
    collections,
    missingRecommendations,
  };
};
