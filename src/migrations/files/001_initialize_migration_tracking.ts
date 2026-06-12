import { Migration } from '../migration.types';

/**
 * Initial migration: creates the migration tracking collections and indexes.
 * The MigrationModel and MigrationLockModel already define these indexes,
 * but running them explicitly guarantees they exist on fresh databases.
 */
const migration: Migration = {
  name: '001_initialize_migration_tracking',
  description: 'Create migration tracking collections and indexes',
  async up({ connection }) {
    const db = connection.db;
    if (!db) {
      throw new Error('Database connection not available');
    }

    await db.collection('migrations').createIndex({ name: 1 }, { unique: true });
    await db.collection('migrations').createIndex({ appliedAt: 1 });

    await db
      .collection('migrationlocks')
      .createIndex({ lockedAt: 1 }, { expireAfterSeconds: 300 });
  },

  async down({ connection }) {
    const db = connection.db;
    if (!db) return;

    await db.collection('migrations').drop();
    await db.collection('migrationlocks').drop();
  },
};

export default migration;
