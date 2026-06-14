import { describe, it, expect } from 'vitest';
import seeder001 from '../../../seeders/files/001_seed_admin_user';
import seeder002 from '../../../seeders/files/002_seed_demo_team_and_project';

describe('seeder files', () => {
  it('should export valid seeder objects', () => {
    const seeders = [seeder001, seeder002];

    for (const seeder of seeders) {
      expect(seeder).toHaveProperty('name');
      expect(typeof seeder.name).toBe('string');
      expect(typeof seeder.run).toBe('function');
    }
  });

  it('should have unique seeder names', () => {
    const names = [seeder001.name, seeder002.name];
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });

  it('should restrict demo data seed to development and test', () => {
    expect(seeder001.environments).toContain('development');
    expect(seeder001.environments).toContain('test');
    expect(seeder002.environments).toContain('development');
    expect(seeder002.environments).toContain('test');
  });
});
