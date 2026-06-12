import { Migration } from '../migration.types';

/**
 * Ensures all application-level indexes exist. Mongoose creates declared
 * indexes automatically, but explicit migrations make schema changes
 * reproducible across environments and easier to review in code review.
 */
const migration: Migration = {
  name: '002_ensure_application_indexes',
  description: 'Create/verify application collection indexes',
  async up({ connection }) {
    const db = connection.db;
    if (!db) {
      throw new Error('Database connection not available');
    }

    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ role: 1, createdAt: -1 });
    await db.collection('users').createIndex({ isVerified: 1 });
    await db.collection('users').createIndex(
      { provider: 1, providerId: 1 },
      { unique: true, sparse: true }
    );

    await db.collection('teams').createIndex({ ownerId: 1 });
    await db.collection('teams').createIndex({ 'members.userId': 1 });
    await db.collection('teams').createIndex({ createdAt: -1 });

    await db.collection('projects').createIndex({ ownerId: 1 });
    await db.collection('projects').createIndex({ teamId: 1 });
    await db.collection('projects').createIndex({ status: 1 });
    await db.collection('projects').createIndex({ createdAt: -1 });

    await db.collection('tasks').createIndex({ projectId: 1, status: 1 });
    await db.collection('tasks').createIndex({ assignedTo: 1, status: 1 });
    await db.collection('tasks').createIndex({ status: 1, dueDate: 1 });
    await db.collection('tasks').createIndex({ createdBy: 1 });
    await db.collection('tasks').createIndex({ dueDate: 1 });

    await db.collection('comments').createIndex({ taskId: 1 });
    await db.collection('comments').createIndex({ userId: 1 });
    await db.collection('comments').createIndex({ parentId: 1 });
    await db.collection('comments').createIndex({ createdAt: -1 });
    await db.collection('comments').createIndex({ taskId: 1, createdAt: -1 });

    await db.collection('notifications').createIndex({ userId: 1 });
    await db.collection('notifications').createIndex({ isRead: 1 });
    await db.collection('notifications').createIndex({ createdAt: 1 });
    await db.collection('notifications').createIndex({ userId: 1, isRead: 1, createdAt: -1 });
    await db.collection('notifications').createIndex({ status: 1, scheduledAt: 1 });

    await db.collection('apikeys').createIndex({ userId: 1, createdAt: -1 });
    await db.collection('apikeys').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    await db.collection('apikeys').createIndex({ publicId: 1 }, { unique: true });
  },

  async down({ connection }) {
    const db = connection.db;
    if (!db) return;

    const collections = [
      'users',
      'teams',
      'projects',
      'tasks',
      'comments',
      'notifications',
      'apikeys',
    ];

    for (const name of collections) {
      try {
        await db.collection(name).dropIndexes();
      } catch {
        // Ignore errors if collection/indexes do not exist.
      }
    }
  },
};

export default migration;
