import { createClient } from "redis";

import logger from "../utils/logger.js";

let client = null;

export function getRedisClient() {
  if (!process.env.REDIS_URL) return null;
  if (client) return client;

  client = createNewRedisClient();
  return client;
}

// Creates an independent Redis client (not the shared singleton).
// Use this when a second connection is needed, e.g. the Socket.IO sub client.
export function createNewRedisClient() {
  if (!process.env.REDIS_URL) return null;

  const c = createClient({ url: process.env.REDIS_URL });
  c.on("error", (err) =>
    logger.error(`Redis client error: ${err.message}`, { error: err }),
  );
  c.connect().catch((err) =>
    logger.error(`Redis connect failed: ${err.message}`, { error: err }),
  );
  return c;
}
