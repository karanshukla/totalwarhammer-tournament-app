import express from "express";

import * as guestController from "../controllers/guest-controller.js";
import { authenticateGuestSession } from "../middleware/auth-middleware.js";
import { validateGuestUsername } from "../middleware/validation/user-validation.js";
import { validationHandler } from "../middleware/validation/validation-handler.js";

const router = express.Router();

// Create a guest user without authentication
router.post("/", guestController.createGuestUser);

// Update guest username (using the more lenient guest authentication)
router.post(
  "/username",
  authenticateGuestSession,
  validateGuestUsername,
  validationHandler,
  guestController.updateGuestUsername
);

export default router;
