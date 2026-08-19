import express from "express";

import logger from "../../../infrastructure/utils/logger.js";
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
    logger.debug("CSRF token generated successfully");

    res.json({ csrfToken: token });
  } catch (error) {
    logger.error(`Error generating CSRF token: ${error.message}`, { error });
    res.status(500).json({ error: "Failed to generate CSRF token" });
  }
});

router.post(
  "/login",
  validateLogin,
  validationHandler,
  authenticationController.login,
);

router.post("/logout", authenticationController.logout);
router.delete("/logout", authenticationController.logout);

router.post(
  "/token",
  validateToken,
  validationHandler,
  authenticationController.token,
);

export default router;
