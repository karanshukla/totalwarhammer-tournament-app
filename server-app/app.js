import cookieParser from "cookie-parser";
import express from "express";
import mongoSanitize from "express-mongo-sanitize";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import xss from "xss-clean";
import session from "express-session";
import hpp from "hpp";
import cors from "cors";

import { port } from "./src/infrastructure/config/env.js";
import { connectToDatabase } from "./src/infrastructure/db/connection.js";
import routes from "./src/interfaces/http/routes/index.js";

// Create Express application
const app = express();

// Connect to database
connectToDatabase();

// Security
app.use(helmet());
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

// CORS configuration
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production", // true in production
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      sameSite: "lax",
    },
  })
);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cookieParser());

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, //15 minutes
  max: 100,
  message: "Too many requests from this IP, please try again later.",
});
app.use(limiter);

// Routes
app.use(routes);

// Start server
app.listen(port, "::", () => {
  console.log(`Server listening on [::]${port}`);
});

export default app;
