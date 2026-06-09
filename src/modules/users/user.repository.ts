import { UserDocument, UserModel } from "./user.model";

export const userRepository = {
  async findAll(): Promise<UserDocument[]> {
    return UserModel.find().lean();
  }
};
