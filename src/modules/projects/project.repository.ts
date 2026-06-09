import { ProjectDocument, ProjectModel } from "./project.model";

export const projectRepository = {
  async findAll(): Promise<ProjectDocument[]> {
    return ProjectModel.find().lean();
  }
};
