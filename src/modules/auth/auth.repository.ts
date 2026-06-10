import { userRepository } from '../users/user.repository';
import { UserDocument } from '../users/user.model';

export const authRepository = {
  async findByEmail(email: string): Promise<UserDocument | null> {
    return userRepository.findByEmailWithPassword(email);
  },

  async create(data: Record<string, unknown>): Promise<UserDocument> {
    return userRepository.create(data as Partial<UserDocument>);
  },

  async updateById(id: string, data: Record<string, unknown>): Promise<UserDocument | null> {
    return userRepository.updateById(id, data as Partial<UserDocument>);
  },

  async updateLastLogin(id: string): Promise<void> {
    return userRepository.updateLastLogin(id);
  },
};
