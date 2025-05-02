import express from "express";
import * as userController from "../controllers/user-controller.js";
import * as authenticationController from "../controllers/authentication-controller.js";
import authenticateToken from "../middleware/auth-middleware.js"; // Import the middleware
import {
  validateUserExists,
  validateUserRegistration,
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

export default router;
