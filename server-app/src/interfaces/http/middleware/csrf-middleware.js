import crypto from "crypto";

import { doubleCsrf } from "csrf-csrf";

import logger from "../../../infrastructure/utils/logger.js";

// process.exit() cannot be exercised in-process without killing the test runner.
/* node:coverage disable */
if (process.env.NODE_ENV === "production" && !process.env.CSRF_SECRET) {
  logger.error("CSRF_SECRET is not set in production environment");
  process.exit(1);
}
/* node:coverage enable */

// A per-process random secret keeps tokens unforgeable when CSRF_SECRET is
// unset; the trade-off is that tokens don't survive a restart, which is the
// correct failure mode for a non-production environment.
const CSRF_SECRET =
  process.env.CSRF_SECRET || crypto.randomBytes(32).toString("hex");

const { doubleCsrfProtection, generateCsrfToken, invalidCsrfTokenError } =
  doubleCsrf({
    getSessionIdentifier: (req) => {
      const sessionId = req.session?.id;
      if (!sessionId) {
        logger.warn("CSRF: No session ID found in request");
      }
      return sessionId;
    },

    getSecret: () => CSRF_SECRET,

    // The __Host- prefix (csrf-csrf's default) requires the Secure attribute by spec.
    // Any RFC-compliant HTTP client (including Hurl) will refuse to store or send it
    // over plain HTTP, breaking test environments. Use a plain name in non-production.
    cookieName:
      process.env.NODE_ENV === "production"
        ? "__Host-psifi.x-csrf-token"
        : "psifi.x-csrf-token",

    cookieOptions: {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "Strict" : "Lax",
      secure: process.env.NODE_ENV === "production",
      path: "/", // Changed from /api to / to ensure cookie is sent with all requests
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    },

    getCsrfTokenFromRequest: (req) => {
      return req.headers["x-csrf-token"];
    },

    ignoredMethods: ["GET", "HEAD", "OPTIONS"],

    size: 64,
    ignoreCsrfSizeCheck: true,
  });

/** @type {import('express').RequestHandler} */
const csrfPrerequisiteCheck = (req, res, next) => {
  if (!req.session) {
    logger.warn("CSRF: No session object found in request");
  }
  next();
};

/** @type {import('express').ErrorRequestHandler} */
const csrfErrorHandler = (err, req, res, next) => {
  // Skip CSRF validation for preflight OPTIONS requests
  if (req.method === "OPTIONS") {
    return next();
  }

  if (err === invalidCsrfTokenError) {
    logger.warn(`CSRF validation failed: ${req.method} ${req.path}`, {
      origin: req.headers.origin,
      hasSession: !!req.session?.id,
      hasToken: !!req.headers["x-csrf-token"],
    });
    return res.status(403).json({
      success: false,
      error: "CSRF validation failed",
      message: "Invalid or missing CSRF token",
    });
  }
  next(err);
};

export {
  doubleCsrfProtection,
  generateCsrfToken,
  invalidCsrfTokenError,
  csrfErrorHandler,
  csrfPrerequisiteCheck,
};
