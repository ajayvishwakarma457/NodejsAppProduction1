export const authRepository = {
  async findByEmail(email: string) {
    return {
      id: "user-1",
      email,
      password: "secret",
      role: "admin"
    };
  }
};

