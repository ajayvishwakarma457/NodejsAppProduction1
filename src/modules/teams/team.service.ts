import { teamRepository } from "./team.repository";

export const teamService = {
  async list() {
    return teamRepository.findAll();
  },

  async findById(id: string) {
    return teamRepository.findById(id);
  }
};

