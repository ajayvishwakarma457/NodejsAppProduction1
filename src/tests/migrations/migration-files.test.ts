import { describe, it, expect } from 'vitest';
import migration001 from '../../migrations/files/001_initialize_migration_tracking';
import migration002 from '../../migrations/files/002_ensure_application_indexes';

describe('migration files', () => {
  it('should export valid migration objects', () => {
    const migrations = [migration001, migration002];

    for (const migration of migrations) {
      expect(migration).toHaveProperty('name');
      expect(typeof migration.name).toBe('string');
      expect(typeof migration.up).toBe('function');
      expect(typeof migration.down).toBe('function');
    }
  });

  it('should have unique migration names', () => {
    const names = [migration001.name, migration002.name];
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });
});
