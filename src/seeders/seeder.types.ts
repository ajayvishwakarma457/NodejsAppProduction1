export interface SeederContext {
  environment: string;
}

export interface Seeder {
  name: string;
  description?: string;
  environments?: string[];
  idempotent?: boolean;
  run: (context: SeederContext) => Promise<void>;
}

export interface SeederRecord {
  name: string;
  runAt: Date;
  environment: string;
}

export interface SeederStatus {
  name: string;
  run: boolean;
  runAt: Date | null;
  environment: string | null;
}

export interface SeederOptions {
  environment?: string;
  dryRun?: boolean;
  force?: boolean;
}
