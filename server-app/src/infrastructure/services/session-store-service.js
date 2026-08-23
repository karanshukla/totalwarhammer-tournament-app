import MongoDBStore from "connect-mongodb-session";
import { RedisStore } from "connect-redis";
// eslint is complaining about the import above but it is correct
import session from "express-session";

import { mongoUri } from "../config/env.js";
import logger from "../utils/logger.js";

import { getRedisClient } from "./redis-service.js";

/**
 * Configures and returns the appropriate session store based on environment configuration
 * @param {Object} options - Configuration options
 * @returns {Object} Configured session store (Redis or MongoDB)
 */
export function configureSessionStore() {
  let sessionStore;

  if (process.env.USE_MONGO_SESSION === "true" || !process.env.REDIS_URL) {
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
    logger.info("Using Redis session store");
    sessionStore = new RedisStore({
      client: getRedisClient(),
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
      // "auto" rather than `isProduction`: with a hard `true`, express-session
      // silently emits no Set-Cookie at all when the forwarded scheme isn't
      // https, so a login succeeds server-side and every request after it 401s
      // with nothing logged. "auto" degrades to a cookie without the Secure
      // flag instead of no session at all; warnOnInsecureForwardedScheme below
      // is what makes that degraded state visible.
      secure: "auto",
      httpOnly: true,
      maxAge: 2 * 60 * 60 * 1000, // 2 hours default; overridden per-session by auth-state-service
      sameSite: isProduction ? "strict" : "lax",
      path: "/",
    },
  });
}

/**
 * Reports the first production request whose forwarded scheme is not https.
 *
 * express-session decides the session cookie's Secure flag from this header
 * alone, and a reverse proxy that reports the wrong scheme degrades every
 * session cookie in the deployment without failing any request. Only the proxy
 * can get this wrong, and nothing else surfaces it, so it is reported once per
 * process rather than left to be inferred from users being logged out.
 *
 * @returns {import('express').RequestHandler}
 */
export function warnOnInsecureForwardedScheme() {
  let alreadyReported = false;

  return (req, _res, next) => {
    if (alreadyReported || process.env.NODE_ENV !== "production") return next();

    const forwardedScheme = (req.headers["x-forwarded-proto"] || "")
      .split(",")[0]
      .trim()
      .toLowerCase();

    if (forwardedScheme !== "https") {
      alreadyReported = true;
      logger.error(
        `Reverse proxy reported X-Forwarded-Proto: "${forwardedScheme || "(absent)"}" — session cookies are being issued without the Secure flag. Configure the proxy to forward the real scheme.`,
      );
    }

    return next();
  };
}
