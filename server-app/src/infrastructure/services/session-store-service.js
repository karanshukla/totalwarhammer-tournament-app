import MongoDBStore from "connect-mongodb-session";
import { RedisStore } from "connect-redis";
// eslint is complaining about the import above but it is correct
import session from "express-session";
import { createClient } from "redis";

import { mongoUri } from "../config/env.js";
import logger from "../utils/logger.js";

/**
 * Configures and returns the appropriate session store based on environment configuration
 * @param {Object} options - Configuration options
 * @returns {Object} Configured session store (Redis or MongoDB)
 */
export function configureSessionStore() {
  let sessionStore;

  if (process.env.USE_MONGO_SESSION === "true") {
    logger.info("Using MongoDB session store");
    const MongoDBSessionStore = MongoDBStore(session);
    sessionStore = new MongoDBSessionStore({
      databaseName: "twt-app-sessions",
      uri: mongoUri,
      collection: "sessions",
      expires: 30 * 24 * 60 * 60 * 1000, // 30 days (max remember-me lifetime)
    });

    sessionStore.on("error", function (error) {
      logger.error(`MongoDB session store error: ${error.message}`, { error });
    });
  } else {
    // Initialize Redis client for Redis session store
    logger.info("Using Redis session store");
    const redisClient = createClient({
      url: process.env.REDIS_URL,
    });

    redisClient.connect().catch((err) => {
      logger.error(`Redis client connection error: ${err.message}`, {
        error: err,
      });
    });

    sessionStore = new RedisStore({
      client: redisClient,
      prefix: "twt-app-session:",
      ttl: 30 * 24 * 60 * 60, // 30 days (max remember-me lifetime)
    });
  }

  return sessionStore;
}

/**
 * Configures and returns the session middleware
 * @param {string} sessionSecret - The session secret
 * @param {boolean} isProduction - Whether the environment is production
 * @returns {Function} Configured session middleware
 */
export function configureSessionMiddleware(sessionSecret, isProduction) {
  const sessionStore = configureSessionStore();

  return session({
    secret: sessionSecret,
    name: "sid",
    resave: false,
    saveUninitialized: false,
    rolling: false,
    store: sessionStore,
    proxy: true, // Because we set 'trust proxy'
    cookie: {
      secure: "auto",
      httpOnly: true,
      maxAge: 2 * 60 * 60 * 1000, // 2 hours default; overridden per-session by auth-state-service
      sameSite: isProduction ? "strict" : "lax",
      path: "/",
    },
  });
}
