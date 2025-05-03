import MongoDBStore from "connect-mongodb-session";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import mongoSanitize from "express-mongo-sanitize";
import { rateLimit } from "express-rate-limit";
import session from "express-session";
import helmet from "helmet";
import hpp from "hpp";
import xss from "xss-clean";

import { port, mongoUri } from "./src/infrastructure/config/env.js";
import { connectToDatabase } from "./src/infrastructure/db/connection.js";
import {
  csrfErrorHandler,
  csrfPrerequisiteCheck,
} from "./src/interfaces/http/middleware/csrf-middleware.js";
import routes from "./src/interfaces/http/routes/index.js";

// Create Express application
const app = express();

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
  console.error("Session store error:", error);
});

// Security
app.use(
  helmet({
    contentSecurityPolicy: false, // Disable CSP for development
    crossOriginEmbedderPolicy: false, // Allow cross-origin embedding for dev
  })
);
app.use(mongoSanitize());
app.use(xss());
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
const SESSION_SECRET =
  process.env.SESSION_SECRET || "super-strong-secret-key-for-development-only";
app.use(
  session({
    secret: SESSION_SECRET,
    name: "sid", // Use a generic name instead of default "connect.sid"
    resave: false,
    saveUninitialized: true, // Save even uninitialized sessions for CSRF to work
    rolling: true, // Reset expiration with each request
    store: store, // Use MongoDB to store sessions
    cookie: {
      secure: process.env.NODE_ENV === "production", // Only use secure in production
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: "lax", // Important for CORS requests to work with cookies
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
  console.log(
    `${req.method} ${req.url} - Session ID: ${req.session?.id || "none"}`
  );
  next();
});

// Routes
app.use(routes);

// CSRF Error handler - place after routes but before other error handlers
app.use(csrfErrorHandler);

// Generic error handler
app.use((err, req, res) => {
  console.error("Application error:", err);
  res.status(500).json({
    error: "Server error",
    message:
      process.env.NODE_ENV === "production"
        ? "An unexpected error occurred"
        : err.message,
  });
});

// Start server
app.listen(port, "::", () => {
  console.log(`Server listening on [::]${port}`);
});

export default app;
