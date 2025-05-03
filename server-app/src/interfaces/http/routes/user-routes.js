import express from "express";

import * as authenticationController from "../controllers/authentication-controller.js";
import * as userController from "../controllers/user-controller.js";
import authenticateToken from "../middleware/auth-middleware.js";
import {
  validateUserExists,
  validateUserRegistration,
  validateGuestUsername,
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
router.post("/logout", authenticationController.logout);
router.get(
  "/exists",
  validateUserExists,
  validationHandler,
  userController.userExists
);
router.post("/guest", userController.createGuestUser);
router.post(
  "/guest/update-username",
  authenticateToken,
  validateGuestUsername,
  validationHandler,
  userController.updateGuestUsername
);

export default router;
