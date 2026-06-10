import { userRepository } from "../users/user.repository";

export const authRepository = {
  async findByEmail(email: string) {
    return userRepository.findByEmailWithPassword(email);
  }
};
