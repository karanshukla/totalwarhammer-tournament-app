import express from "express";
import * as passwordResetController from "../controllers/password-reset-controller.js";
import {
  validatePasswordResetEmail,
  validateResetToken,
  validateResetPassword,
} from "../middleware/validation/password-reset-validation.js";
import { validationHandler } from "../middleware/validation/validation-handler.js";

const router = express.Router();

// Public routes for password reset workflow
router.post(
  "/request",
  validatePasswordResetEmail,
  validationHandler,
  passwordResetController.sendPasswordResetEmail
);
router.post(
  "/verify",
  validateResetToken,
  validationHandler,
  passwordResetController.verifyResetToken
);
router.post(
  "/reset",
  validateResetPassword,
  validationHandler,
  passwordResetController.resetPassword
);

export default router;
