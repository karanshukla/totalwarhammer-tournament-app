import express from "express";
import * as passwordResetController from "../controllers/password-reset-controller.js";

const router = express.Router();

// Public routes for password reset workflow
router.post("/request", passwordResetController.sendPasswordResetEmail);
router.post("/verify", passwordResetController.verifyResetToken);
router.post("/reset", passwordResetController.resetPassword);

export default router;
