import { doubleCsrf } from "csrf-csrf";

// Use a fixed secret in development for consistency
const CSRF_SECRET =
  process.env.CSRF_SECRET ||
  "development-csrf-secret-key-for-testing-purposes-only";

// Initialize the CSRF protection middleware with more debugging
const { doubleCsrfProtection, generateCsrfToken, invalidCsrfTokenError } =
  doubleCsrf({
    getSessionIdentifier: (req) => {
      const sessionId = req.session?.id;
      if (!sessionId) {
        console.warn("CSRF Warning: No session ID found in request");
      }
      return sessionId;
    },

    // Use fixed secret key for consistent tokens
    getSecret: () => CSRF_SECRET,

    cookieOptions: {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "Strict" : "Lax",
      secure: process.env.NODE_ENV === "production",
      path: "/", // Changed from /api to / to ensure cookie is sent with all requests
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    },

    // Get the CSRF token from request headers
    getCsrfTokenFromRequest: (req) => {
      const token = req.headers["x-csrf-token"];
      if (!token) {
        console.warn("CSRF Warning: No X-CSRF-Token header found in request");
      }
      return token;
    },

    // Ignore specific methods that don't need CSRF protection
    ignoredMethods: ["GET", "HEAD", "OPTIONS"],

    // Enable size validation bypass for token
    size: 64,
    ignoreCsrfSizeCheck: true,
  });

// Middleware to check for missing CSRF prerequisites
const csrfPrerequisiteCheck = (req, res, next) => {
  // Ensure session is established
  if (!req.session) {
    console.warn("CSRF Warning: No session object found in request");
  }

  next();
};

// Enhanced error handling middleware for CSRF errors
const csrfErrorHandler = (err, req, res, next) => {
  if (err === invalidCsrfTokenError) {
    console.error("CSRF Error:", {
      sessionId: req.session?.id,
      tokenHeader: req.headers["x-csrf-token"],
      cookies: req.cookies,
    });

    return res.status(403).json({
      error: "CSRF validation failed",
      message: "Invalid or missing CSRF token",
      debug:
        process.env.NODE_ENV !== "production"
          ? {
              hasSession: !!req.session,
              hasSessionId: !!req.session?.id,
              hasToken: !!req.headers["x-csrf-token"],
            }
          : undefined,
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
