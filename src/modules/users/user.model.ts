import { InferSchemaType, Schema, Types, model } from 'mongoose';
import bcrypt from 'bcryptjs';

/* ------------------------------------------------------------------ */
// Constants
/* ------------------------------------------------------------------ */

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const BCRYPT_SALT_ROUNDS = 12;

/* ------------------------------------------------------------------ */
// Schema
/* ------------------------------------------------------------------ */

const userSchema = new Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: [255, 'Email cannot exceed 255 characters'],
      match: [EMAIL_REGEX, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
      default: null,
    },
    avatar: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ['admin', 'manager', 'member'],
      default: 'member',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    refreshToken: {
      type: String,
      select: false,
      default: null,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    provider: {
      type: String,
      enum: ['local', 'google', 'github'],
      default: 'local',
    },
    providerId: {
      type: String,
      default: null,
      sparse: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.password;
        delete ret.refreshToken;
        delete ret.__v;
        ret.id = ret._id;
        delete ret._id;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.password;
        delete ret.refreshToken;
        delete ret.__v;
        return ret;
      },
    },
  }
);

/* ------------------------------------------------------------------ */
// Indexes
/* ------------------------------------------------------------------ */

// Unique index is already created by `unique: true` on the email field,
// but explicit declaration makes intent clear and allows custom options.
userSchema.index({ email: 1 }, { unique: true, name: 'email_unique_idx' });

// Compound index for admin dashboards that list users by role.
userSchema.index({ role: 1, createdAt: -1 }, { name: 'role_createdat_idx' });

// Index for filtering unverified users (e.g. cleanup jobs or re-send flows).
userSchema.index({ isVerified: 1 }, { name: 'isverified_idx' });

// Partial unique index for OAuth provider lookups.
// Only enforces uniqueness for documents that have a real providerId,
// allowing multiple local users that do not link an OAuth account.
userSchema.index(
  { provider: 1, providerId: 1 },
  {
    unique: true,
    name: 'provider_providerid_idx',
    partialFilterExpression: { providerId: { $type: 'string' } },
  }
);

// Text index for user search across name and email.
userSchema.index(
  { firstName: 'text', lastName: 'text', email: 'text' },
  { name: 'user_text_search_idx', weights: { firstName: 10, lastName: 10, email: 5 } }
);

// Compound index for listing users by verification status and creation time.
userSchema.index({ isVerified: 1, createdAt: -1 }, { name: 'isverified_createdat_idx' });

/* ------------------------------------------------------------------ */
// Virtuals
/* ------------------------------------------------------------------ */

userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

/* ------------------------------------------------------------------ */
// Middleware
/* ------------------------------------------------------------------ */

/**
 * Hash the password before saving.
 * Only hashes when the password field has been modified (new doc or password change).
 */
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err as Error);
  }
});

/* ------------------------------------------------------------------ */
// Instance Methods
/* ------------------------------------------------------------------ */

userSchema.methods.comparePassword = async function (candidatePassword: string) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

/* ------------------------------------------------------------------ */
// Static Methods
/* ------------------------------------------------------------------ */

userSchema.statics.findByEmail = function (email: string) {
  return this.findOne({ email: email.toLowerCase().trim() }).exec();
};

/* ------------------------------------------------------------------ */
// Export
/* ------------------------------------------------------------------ */

export type UserDocument = InferSchemaType<typeof userSchema> & { _id: Types.ObjectId };

export const UserModel = model('User', userSchema);
