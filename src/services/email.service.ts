export const emailService = {
  async send(to: string, subject: string, body: string) {
    return { to, subject, body, queued: true };
  }
};

