import mongoose from "mongoose";
import { logger } from "./logger";
import { env } from "./env";

export const db = {
  url: env.MONGODB_URI,
  async connect() {
    await mongoose.connect(env.MONGODB_URI);
    logger.info("MongoDB connected", { url: env.MONGODB_URI });
  }
};
