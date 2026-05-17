import { createClient } from "redis";

import logger from "../utils/logger.js";

let client = null;

export function getRedisClient() {
  if (!process.env.REDIS_URL) return null;
  if (client) return client;

  client = createClient({ url: process.env.REDIS_URL });
  client.on("error", (err) =>
    logger.error(`Redis client error: ${err.message}`, { error: err }),
  );
  client
    .connect()
    .catch((err) =>
      logger.error(`Redis connect failed: ${err.message}`, { error: err }),
    );

  return client;
}
