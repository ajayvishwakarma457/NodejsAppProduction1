import { ClientSession, Connection } from 'mongoose';

export interface MigrationContext {
  connection: Connection;
  session: ClientSession | null;
}

export interface Migration {
  name: string;
  description?: string;
  up: (context: MigrationContext) => Promise<void>;
  down: (context: MigrationContext) => Promise<void>;
}

export interface MigrationRecord {
  name: string;
  appliedAt: Date;
  batch: number;
}

export interface MigrationStatus {
  name: string;
  applied: boolean;
  appliedAt: Date | null;
  batch: number | null;
}

export interface MigrationOptions {
  direction: 'up' | 'down';
  steps?: number;
  dryRun?: boolean;
}
