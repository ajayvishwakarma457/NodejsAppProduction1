import { authRepository } from "./auth.repository";
import { sanitizeAuthUser } from "./auth.utils";

export const authService = {
  async login(email: string) {
    const user = await authRepository.findByEmail(email);
    return sanitizeAuthUser(user);
  }
};

