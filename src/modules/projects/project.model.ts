import { InferSchemaType, Schema, model } from "mongoose";

const projectSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["active", "completed", "archived"],
      default: "active"
    },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    teamId: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    startDate: { type: Date },
    dueDate: { type: Date }
  },
  {
    timestamps: true
  }
);

export type ProjectDocument = InferSchemaType<typeof projectSchema>;

export const ProjectModel = model<ProjectDocument>("Project", projectSchema);
