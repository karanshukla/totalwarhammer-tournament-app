import express from "express";

import * as guestController from "../controllers/guest-controller.js";
import authenticateSession from "../middleware/auth-middleware.js";

const router = express.Router();

// Create a guest user without authentication
router.post("/", guestController.createGuestUser);

// Update guest username (only for authenticated guest users)
router.post(
  "/username",
  authenticateSession,
  guestController.updateGuestUsername
);

export default router;
