import { InferSchemaType, Schema, model } from "mongoose";

/* ------------------------------------------------------------------ */
// Schema
/* ------------------------------------------------------------------ */

const projectSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
      maxlength: [100, "Project name cannot exceed 100 characters"]
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"]
    },
    status: {
      type: String,
      enum: ["active", "completed", "archived"],
      default: "active"
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Owner id is required"]
    },
    teamId: {
      type: Schema.Types.ObjectId,
      ref: "Team",
      required: [true, "Team id is required"]
    },
    startDate: {
      type: Date,
      default: null
    },
    dueDate: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.__v;
        ret.id = ret._id;
        delete ret._id;
        return ret;
      }
    },
    toObject: {
      virtuals: true,
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.__v;
        return ret;
      }
    }
  }
);

/* ------------------------------------------------------------------ */
// Indexes
/* ------------------------------------------------------------------ */

projectSchema.index({ ownerId: 1 }, { name: "ownerid_idx" });
projectSchema.index({ teamId: 1 }, { name: "teamid_idx" });
projectSchema.index({ status: 1 }, { name: "status_idx" });
projectSchema.index({ createdAt: -1 }, { name: "createdat_idx" });

/* ------------------------------------------------------------------ */
// Virtuals
/* ------------------------------------------------------------------ */

projectSchema.virtual("isOverdue").get(function () {
  if (!this.dueDate || this.status === "completed") {
    return false;
  }
  return new Date() > this.dueDate;
});

/* ------------------------------------------------------------------ */
// Export
/* ------------------------------------------------------------------ */

export type ProjectDocument = InferSchemaType<typeof projectSchema>;

export const ProjectModel = model<ProjectDocument>("Project", projectSchema);
