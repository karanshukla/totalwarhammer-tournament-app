import { createServer } from "http";

import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import mongoSanitize from "express-mongo-sanitize";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import hpp from "hpp";
import { FilterXSS } from "xss";

import "./src/infrastructure/config/env-loader.js";

// Import logger for centralized logging
import {
  port,
  clientUrl,
  rateLimitGlobalMax,
  rateLimitAuthMax,
} from "./src/infrastructure/config/env.js";
import { passport } from "./src/infrastructure/config/passport-config.js";
import { connectToDatabase } from "./src/infrastructure/db/connection.js";
import {
  configureSessionMiddleware,
  warnOnInsecureForwardedScheme,
} from "./src/infrastructure/services/session-store-service.js";
import { initSocketIO } from "./src/infrastructure/socket/socket-service.js";
import logger from "./src/infrastructure/utils/logger.js";
import {
  csrfErrorHandler,
  csrfPrerequisiteCheck,
} from "./src/interfaces/http/middleware/csrf-middleware.js";
import routes from "./src/interfaces/http/routes/index.js";

// Create XSS filter instance
const xssFilter = new FilterXSS({});

// Create Express application
const app = express();
const httpServer = createServer(app);

// Trust proxy if running behind one (common in staging/production)
app.set("trust proxy", 1);

// Health check — must be before all middleware so it always responds
app.get("/health", (_req, res) => res.status(200).send("OK"));

// Connect to database
connectToDatabase();

// Security
app.use(helmet({}));

// Express 5 made req.query a read-only getter that returns a fresh object on
// every access, so express-mongo-sanitize's strategy of reassigning req.query
// throws a TypeError. Instead we shadow the getter with a sanitized own
// property so all subsequent middleware can safely read and write req.query.
app.use((req, _res, next) => {
  const sanitizedQuery = mongoSanitize.sanitize({ ...req.query });
  Object.defineProperty(req, "query", {
    value: sanitizedQuery,
    writable: true,
    enumerable: true,
    configurable: true,
  });
  next();
});

app.use((req, _res, next) => {
  if (req.query) {
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === "string") {
        req.query[key] = xssFilter.process(value);
      }
    }
  }

  next();
});
// IMPORTANT: Add cookie parser before CORS and session
app.use(cookieParser());

// CORS configuration - make sure it's before session middleware
app.use(
  cors({
    origin: clientUrl,
    credentials: true, // IMPORTANT: needed for cookies to work cross-origin
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
  }),
);

// Session configuration - must come after cookieParser and CORS
const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  logger.error("SESSION_SECRET is not set in environment variables");
  process.exit(1);
}

// Determine environment-appropriate cookie settings
const isProduction = process.env.NODE_ENV === "production";

logger.info(
  `Starting server in ${process.env.NODE_ENV || "development"} environment`,
);
logger.info(`CORS origin: ${clientUrl}`);

// Configure and use session middleware
app.use(warnOnInsecureForwardedScheme());
app.use(configureSessionMiddleware(SESSION_SECRET, isProduction));

// Passport session support — must come after express-session
app.use(passport.initialize());
app.use(passport.session());

// Add CSRF prerequisite check to debug session issues
app.use(csrfPrerequisiteCheck);

// JSON and URL encoded middleware — limit body size to prevent payload flooding
app.use(express.json({ limit: "50kb" }));
app.use(express.urlencoded({ extended: true, limit: "50kb" }));

// Sanitize parsed body and apply XSS filter to body strings.
// Both must run after body parsing; previously mongoSanitize ran before
// express.json() so req.body was always undefined there.
// Escaping a password silently rewrites it (`<` becomes `&lt;`) and narrows the
// usable character set. It is hashed, never rendered, so it must pass through
// untouched.
const NON_RENDERED_FIELDS = new Set([
  "password",
  "newPassword",
  "currentPassword",
  "confirmPassword",
]);

const sanitizeStringsDeep = (value, depth = 0) => {
  if (depth > 8) return value;
  if (typeof value === "string") return xssFilter.process(value);
  if (Array.isArray(value))
    return value.map((entry) => sanitizeStringsDeep(entry, depth + 1));
  if (value && typeof value === "object") {
    for (const key of Object.keys(value)) {
      if (NON_RENDERED_FIELDS.has(key)) continue;
      value[key] = sanitizeStringsDeep(value[key], depth + 1);
    }
  }
  return value;
};

app.use((req, _res, next) => {
  if (req.body) {
    req.body = sanitizeStringsDeep(mongoSanitize.sanitize(req.body));
  }
  next();
});

app.use(hpp());

app.use(express.static("public"));

// Global rate limiter — wide safety net
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: rateLimitGlobalMax,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
});
app.use(globalLimiter);

// Tight limiter for authentication endpoints (login, register, token)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: rateLimitAuthMax,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts, please try again later.",
  },
});
app.use("/user/login", authLimiter);
app.use("/auth/login", authLimiter);
app.use("/user/register", authLimiter);
app.use("/auth/token", authLimiter);
// Verifies the current password, so it is a password oracle like login is.
app.use("/user/update-password", authLimiter);

// /user/exists answers "does this account exist?" for any username or email,
// so the global 300/15min budget is an account-enumeration allowance.
const accountLookupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many lookups, please try again later.",
  },
});
app.use("/user/exists", accountLookupLimiter);

// Tight limiter for password reset (prevents email bombing)
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many password reset requests, please try again in an hour.",
  },
});
app.use("/password-reset", passwordResetLimiter);

app.use((req, res, next) => {
  logger.http(
    `${req.method} ${req.url} - session: ${req.session?.id ? "present" : "none"}`,
  );
  next();
});

// Root route redirects to client
app.get("/", (req, res) => {
  res.redirect(clientUrl);
});

// Mount routes directly without /api prefix
app.use(routes);

// CSRF Error handler - place after routes but before other error handlers
app.use(csrfErrorHandler);

// Generic error handler
app.use((err, _req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) {
    logger.error(`Application error: ${err.message}`, { error: err });
  } else {
    logger.warn(`Request rejected (${status}): ${err.message}`);
  }
  res.status(status).json({
    error: status >= 500 ? "Server error occurred" : err.message,
  });
});

// Attach socket.io to the HTTP server
initSocketIO(httpServer, clientUrl);

// Start server
httpServer.listen(port, "::", () => {
  logger.info(`Server listening on [::]${port}`);
});

export default app;
