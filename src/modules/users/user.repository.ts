import { UserModel } from "./user.model";

export const userRepository = {
  async findAll(): Promise<UserModel[]> {
    return [];
  }
};

