export const tokenService = {
  generateAccessToken(userId: string) {
    return `access-${userId}`;
  },
  generateRefreshToken(userId: string) {
    return `refresh-${userId}`;
  }
};

