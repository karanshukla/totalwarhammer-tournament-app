import MongoDBStore from "connect-mongodb-session";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import mongoSanitize from "express-mongo-sanitize";
import { rateLimit } from "express-rate-limit";
import session from "express-session";
import helmet from "helmet";
import hpp from "hpp";
import { FilterXSS } from "xss";

// Import logger for centralized logging
import { port, mongoUri } from "./src/infrastructure/config/env.js";
import { connectToDatabase } from "./src/infrastructure/db/connection.js";
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

// Trust proxy if running behind one (common in staging/production)
app.set("trust proxy", 1);

// Connect to database
connectToDatabase();

// Initialize MongoDB session store
const MongoDBSessionStore = MongoDBStore(session);
const store = new MongoDBSessionStore({
  databaseName: "twta-app-sessions",
  uri: mongoUri,
  collection: "sessions",
  expires: 7 * 24 * 60 * 60 * 1000, // 7 days
});

// Handle store errors
store.on("error", function (error) {
  logger.error(`Session store error: ${error.message}`, { error });
});

// Security
app.use(helmet({}));
app.use(mongoSanitize());
app.use((req, _res, next) => {
  if (req.body) {
    for (const [key, value] of Object.entries(req.body)) {
      if (typeof value === "string") {
        req.body[key] = xssFilter.process(value);
      }
    }
  }

  if (req.query) {
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === "string") {
        req.query[key] = xssFilter.process(value);
      }
    }
  }

  if (req.params) {
    for (const [key, value] of Object.entries(req.params)) {
      if (typeof value === "string") {
        req.params[key] = xssFilter.process(value);
      }
    }
  }

  next();
});
app.use(hpp());

// IMPORTANT: Add cookie parser before CORS and session
app.use(cookieParser());

// CORS configuration - make sure it's before session middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true, // IMPORTANT: needed for cookies to work cross-origin
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
  })
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
  `Starting server in ${process.env.NODE_ENV || "development"} environment`
);
// logger.info(
//   `Session cookie secure attribute: ${useSecureCookies ? "enabled" : "disabled"}`
// ); // Logging will happen dynamically based on request
logger.info(
  `CORS origin: ${process.env.CLIENT_URL || "http://localhost:3000"}`
);

app.use(
  session({
    secret: SESSION_SECRET,
    name: "sid",
    resave: false,
    saveUninitialized: false,
    rolling: false,
    store: store,
    proxy: true, // Add this because we set 'trust proxy'
    cookie: {
      secure: "auto",
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: isProduction ? "strict" : "lax",
      path: "/",
    },
  })
);

// Add CSRF prerequisite check to debug session issues
app.use(csrfPrerequisiteCheck);

// JSON and URL encoded middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: "Too many requests from this IP, please try again later.",
});
app.use(limiter);

// Debug middleware to log session and cookies
app.use((req, res, next) => {
  logger.http(
    `${req.method} ${req.url} - Session ID: ${req.session?.id || "none"}`
  );
  next();
});

// Routes
app.use(routes);

// CSRF Error handler - place after routes but before other error handlers
app.use(csrfErrorHandler);

// Generic error handler
app.use((err) => {
  logger.error(`Application error: ${err.message}`, { error: err });
});

// Start server
app.listen(port, "::", () => {
  logger.info(`Server listening on [::]${port}`);
});

export default app;
