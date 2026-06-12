import { InferSchemaType, Schema, model } from 'mongoose';

const seederSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    runAt: {
      type: Date,
      default: Date.now,
    },
    environment: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: false,
  }
);

seederSchema.index({ runAt: 1 });

export type SeederDocument = InferSchemaType<typeof seederSchema>;

export const SeederModel = model<SeederDocument>('Seeder', seederSchema);
