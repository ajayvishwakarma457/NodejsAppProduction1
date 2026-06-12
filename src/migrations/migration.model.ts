import { InferSchemaType, Schema, model } from 'mongoose';

const migrationSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    appliedAt: {
      type: Date,
      default: Date.now,
    },
    batch: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: false,
  }
);

migrationSchema.index({ appliedAt: 1 });

export type MigrationDocument = InferSchemaType<typeof migrationSchema>;

export const MigrationModel = model<MigrationDocument>('Migration', migrationSchema);
