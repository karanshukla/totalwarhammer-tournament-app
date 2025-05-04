import express from "express";

import * as authenticationController from "../controllers/authentication-controller.js";
import { generateCsrfToken } from "../middleware/csrf-middleware.js";
import {
  validateLogin,
  validateToken,
} from "../middleware/validation/authentication-validation.js";
import { validationHandler } from "../middleware/validation/validation-handler.js";

const router = express.Router();

router.get("/csrf-token", (req, res) => {
  if (!req.session.initialized) {
    req.session.initialized = true;
    req.session.createdAt = Date.now();
  }

  try {
    const token = generateCsrfToken(req, res);
    console.log(`Generated CSRF token for session ${req.session.id}`);

    res.json({
      csrfToken: token,
      sessionId: req.session.id,
    });
  } catch (error) {
    console.error("Error generating CSRF token:", error);
    res.status(500).json({
      error: "Failed to generate CSRF token",
      message: error.message,
    });
  }
});

router.post(
  "/login",
  validateLogin,
  validationHandler,
  authenticationController.login
);

router.post("/logout", authenticationController.logout);
router.delete("/logout", authenticationController.logout);

router.post(
  "/token",
  validateToken,
  validationHandler,
  authenticationController.token
);

export default router;
