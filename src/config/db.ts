import mongoose from "mongoose";
import { logger } from "./logger";
import { env } from "./env";

const MAX_RETRIES = 5;
const BASE_RETRY_DELAY_MS = 1000;

const sanitizeUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    if (parsed.password) {
      parsed.password = "****";
    }
    return parsed.toString();
  } catch {
    return url;
  }
};

const getConnectionOptions = (): mongoose.ConnectOptions => ({
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  retryWrites: true
});

const bindConnectionEvents = () => {
  mongoose.connection.on("connected", () => {
    logger.info("MongoDB connection established");
  });

  mongoose.connection.on("error", (err) => {
    logger.error("MongoDB connection error", { error: err.message });
  });

  mongoose.connection.on("disconnected", () => {
    logger.warn("MongoDB connection disconnected");
  });

  mongoose.connection.on("reconnected", () => {
    logger.info("MongoDB connection reconnected");
  });
};

export const db = {
  url: env.MONGODB_URI,

  async connect(retries = MAX_RETRIES, delay = BASE_RETRY_DELAY_MS): Promise<void> {
    bindConnectionEvents();

    try {
      await mongoose.connect(env.MONGODB_URI, getConnectionOptions());
      logger.info("MongoDB connected", { url: sanitizeUrl(env.MONGODB_URI) });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("MongoDB connection failed", {
        error: err.message,
        retriesLeft: retries,
        url: sanitizeUrl(env.MONGODB_URI)
      });

      if (retries > 0) {
        logger.info(`Retrying MongoDB connection in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.connect(retries - 1, delay * 2);
      }

      throw new Error(`Unable to connect to MongoDB after ${MAX_RETRIES} attempts: ${err.message}`);
    }
  },

  async disconnect(): Promise<void> {
    if (mongoose.connection.readyState === 0) {
      logger.info("MongoDB already disconnected");
      return;
    }

    await mongoose.disconnect();
    logger.info("MongoDB disconnected");
  }
};
