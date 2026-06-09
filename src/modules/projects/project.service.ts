import { projectRepository } from "./project.repository";

export const projectService = {
  async list() {
    return projectRepository.findAll();
  }
};

