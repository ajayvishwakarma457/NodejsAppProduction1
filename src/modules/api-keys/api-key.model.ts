import { InferSchemaType, Schema, Types, model } from 'mongoose';

/* ------------------------------------------------------------------ */
// Constants
/* ------------------------------------------------------------------ */

export const API_KEY_SCOPES = ['read', 'write', 'admin'] as const;

export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

/* ------------------------------------------------------------------ */
// Schema
/* ------------------------------------------------------------------ */

const apiKeySchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'API key name is required'],
      trim: true,
      maxlength: [100, 'API key name cannot exceed 100 characters'],
    },
    publicId: {
      type: String,
      required: [true, 'Public ID is required'],
      unique: true,
      index: true,
    },
    keyHash: {
      type: String,
      required: [true, 'Key hash is required'],
      select: false,
      unique: true,
      index: true,
    },
    keyPrefix: {
      type: String,
      required: [true, 'Key prefix is required'],
    },
    role: {
      type: String,
      enum: ['admin', 'manager', 'member'],
      required: [true, 'Role is required'],
    },
    scopes: {
      type: [String],
      enum: API_KEY_SCOPES,
      default: ['read', 'write'],
      validate: {
        validator: (scopes: string[]) =>
          scopes.length > 0 && scopes.every((s) => API_KEY_SCOPES.includes(s as ApiKeyScope)),
        message: 'Scopes must be a non-empty subset of read, write, admin',
      },
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiration date is required'],
      index: true,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.keyHash;
        delete ret.__v;
        ret.id = ret._id;
        delete ret._id;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.keyHash;
        delete ret.__v;
        return ret;
      },
    },
  }
);

/* ------------------------------------------------------------------ */
// Indexes
/* ------------------------------------------------------------------ */

// Optimize listing and counting a user's API keys.
apiKeySchema.index({ userId: 1, createdAt: -1 }, { name: 'apikey_user_createdat_idx' });

// TTL index to automatically clean up expired keys.
apiKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'apikey_expiresat_ttl_idx' });

// Compound index for active API key validation.
apiKeySchema.index(
  { publicId: 1, isActive: 1, expiresAt: 1 },
  { name: 'apikey_validation_idx' }
);

// Compound index for user listings scoped to active keys.
apiKeySchema.index(
  { userId: 1, isActive: 1, createdAt: -1 },
  { name: 'apikey_user_active_createdat_idx' }
);

/* ------------------------------------------------------------------ */
// Export
/* ------------------------------------------------------------------ */

export type ApiKeyDocument = InferSchemaType<typeof apiKeySchema> & { _id: Types.ObjectId };

export const ApiKeyModel = model<ApiKeyDocument>('ApiKey', apiKeySchema);
