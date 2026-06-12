import { InferSchemaType, Schema, model } from 'mongoose';

const MIGRATION_LOCK_ID = 'migrations';
const LOCK_TTL_SECONDS = 300;

const migrationLockSchema = new Schema(
  {
    _id: {
      type: String,
      default: MIGRATION_LOCK_ID,
    },
    lockedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    owner: {
      type: String,
      required: true,
    },
  },
  {
    _id: false,
    timestamps: false,
  }
);

// Stale locks are automatically released after LOCK_TTL_SECONDS.
migrationLockSchema.index({ lockedAt: 1 }, { expireAfterSeconds: LOCK_TTL_SECONDS });

export type MigrationLockDocument = InferSchemaType<typeof migrationLockSchema>;

export const MigrationLockModel = model<MigrationLockDocument>(
  'MigrationLock',
  migrationLockSchema
);

export const getMigrationLockId = (): string => MIGRATION_LOCK_ID;
