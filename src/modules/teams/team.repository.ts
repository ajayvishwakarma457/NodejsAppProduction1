import { TeamDocument, TeamModel } from "./team.model";

export const teamRepository = {
  async findAll(): Promise<TeamDocument[]> {
    return TeamModel.find().lean();
  },

  async findById(id: string): Promise<TeamDocument | null> {
    return TeamModel.findById(id).lean();
  }
};
