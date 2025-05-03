import express from "express";

import * as authenticationController from "../controllers/authentication-controller.js";
import { generateCsrfToken } from "../middleware/csrf-middleware.js";
import {
  validateLogin,
  validateToken,
} from "../middleware/validation/authentication-validation.js";
import { validationHandler } from "../middleware/validation/validation-handler.js";

const router = express.Router();

// Endpoint to get a CSRF token - explicitly unprotected
router.get("/csrf-token", (req, res) => {
  // Make sure we always have a session
  if (!req.session.initialized) {
    req.session.initialized = true;
    req.session.createdAt = Date.now();
  }

  // Generate a token and send it to the client
  try {
    const token = generateCsrfToken(req, res);
    console.log(`Generated CSRF token for session ${req.session.id}`);

    res.json({
      csrfToken: token,
      sessionId: req.session.id, // Helpful for debugging
    });
  } catch (error) {
    console.error("Error generating CSRF token:", error);
    res.status(500).json({
      error: "Failed to generate CSRF token",
      message: error.message,
    });
  }
});

// Special debug endpoint to check session state
router.get("/session-check", (req, res) => {
  res.json({
    hasSession: !!req.session,
    sessionId: req.session?.id || null,
    cookies: req.cookies,
  });
});

// Login endpoint without CSRF protection - doesn't make sense to require CSRF for login
router.post(
  "/login",
  validateLogin,
  validationHandler,
  authenticationController.login
);

// Logout endpoint without CSRF protection - common to exempt for usability
router.post("/logout", authenticationController.logout);

// Add DELETE method for logout (RESTful approach), also without CSRF protection
router.delete("/logout", authenticationController.logout);

// Token endpoint without CSRF protection - needed for authentication flow
router.post(
  "/token",
  validateToken,
  validationHandler,
  authenticationController.token
);

export default router;
