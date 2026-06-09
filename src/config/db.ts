import { env } from "./env";
import { logger } from "./logger";

export const db = {
  url: env.DATABASE_URL,
  async connect() {
    logger.info("Database connection placeholder initialized", { url: env.DATABASE_URL });
  }
};

