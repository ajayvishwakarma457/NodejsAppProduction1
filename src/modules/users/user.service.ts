import { userRepository } from "./user.repository";

export const userService = {
  async list() {
    return userRepository.findAll();
  }
};

