import { teamRepository } from "./team.repository";

export const teamService = {
  async list() {
    return teamRepository.findAll();
  }
};

