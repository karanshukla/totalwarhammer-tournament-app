import express from "express";

import * as authenticationController from "../controllers/authentication-controller.js";
import * as userController from "../controllers/user-controller.js";
import authenticateSession from "../middleware/auth-middleware.js";
import { doubleCsrfProtection } from "../middleware/csrf-middleware.js";
import {
  validateUserExists,
  validateUserRegistration,
  validateUpdateUsername,
  validateUpdatePassword,
} from "../middleware/validation/user-validation.js";
import { validationHandler } from "../middleware/validation/validation-handler.js";

const router = express.Router();

// Public route - no authentication needed
router.post(
  "/register",
  validateUserRegistration,
  validationHandler,
  userController.register
);
router.post("/login", authenticationController.login);
router.post("/logout", doubleCsrfProtection, authenticationController.logout);
router.get(
  "/exists",
  validateUserExists,
  validationHandler,
  userController.userExists
);
// Guest routes have been removed as they are now handled in guest-routes.js

// Protected routes - require authentication
router.post(
  "/update-username",
  authenticateSession,
  validateUpdateUsername,
  validationHandler,
  userController.updateUsername
);

router.post(
  "/update-password",
  authenticateSession,
  validateUpdatePassword,
  validationHandler,
  userController.updatePassword
);

export default router;
