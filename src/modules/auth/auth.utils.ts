export const sanitizeAuthUser = (user: Record<string, unknown>) => {
  const { password, refreshToken, ...safeUser } = user;
  void password;
  void refreshToken;
  return safeUser;
};

