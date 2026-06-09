import { TOKEN_PREFIX } from "../utils/constants";

export const tokenService = {
  generateAccessToken(userId: string) {
    return `${TOKEN_PREFIX.access}${userId}`;
  },
  generateRefreshToken(userId: string) {
    return `${TOKEN_PREFIX.refresh}${userId}`;
  }
};
