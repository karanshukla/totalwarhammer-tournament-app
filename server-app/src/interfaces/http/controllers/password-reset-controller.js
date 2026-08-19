import bcrypt from "bcrypt";

import PasswordReset from "../../../domain/models/password-reset.js";
import User from "../../../domain/models/user.js";
import { clientUrl } from "../../../infrastructure/config/env.js";
import { createPasswordResetEmail } from "../../../infrastructure/email-templates/password-reset-template.js";
import EmailService from "../../../infrastructure/services/email-service.js";
import logger from "../../../infrastructure/utils/logger.js";

const emailService = new EmailService();

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

/** @type {import('express').RequestHandler} */
export const sendPasswordResetEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.includes("@")) {
      return res.status(400).json({
        success: false,
        message: "Invalid email address",
      });
    }

    const user = await User.findOne({ email: { $eq: email } });
    if (!user) {
      logger.warn("Password reset requested for unknown email");
      return res.status(200).json({
        success: true,
        message: "Password reset email sent successfully",
      });
    }

    const passwordResetToken = await PasswordReset.createResetToken(user._id);
    const resetLink = `${clientUrl}/reset-password?token=${passwordResetToken.resetKey}`;
    const emailContent = createPasswordResetEmail(resetLink);

    // Awaiting the mail provider would make a known address measurably slower
    // to answer than an unknown one, turning the deliberately-identical
    // response into an account-enumeration oracle.
    emailService
      .sendEmail({ to: email, ...emailContent })
      .then(() => logger.info(`Password reset email sent for user ${user._id}`))
      .catch((error) =>
        logger.error(`Password reset email failed: ${error.message}`, {
          error,
        }),
      );

    return res.status(200).json({
      success: true,
      message: "Password reset email sent successfully",
    });
  } catch (error) {
    logger.error(`Send password reset email error: ${error.message}`, {
      error,
    });
    return res.status(500).json({
      success: false,
      message: "Failed to send password reset email",
    });
  }
};

/** @type {import('express').RequestHandler} */
export const verifyResetToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Reset token is required",
      });
    }

    const resetToken = await PasswordReset.validateResetToken(token);

    if (!resetToken) {
      logger.warn("Password reset token verification failed");
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Token is valid",
      data: {
        validUntil: resetToken.createdAt.getTime() + RESET_TOKEN_TTL_MS,
      },
    });
  } catch (error) {
    logger.error(`Verify reset token error: ${error.message}`, { error });
    return res.status(500).json({
      success: false,
      message: "Failed to verify reset token",
    });
  }
};

/** @type {import('express').RequestHandler} */
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Reset token and new password are required",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    const resetToken = await PasswordReset.validateResetToken(token);

    if (!resetToken) {
      logger.warn("Password reset attempted with invalid or expired token");
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    const user = await User.findById(resetToken.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    // Stamp passwordChangedAt so every session issued before this moment is
    // rejected by AuthStateService.isAuthenticated. A password reset is the
    // flow a user runs when they suspect compromise, so it must evict the
    // attacker's sessions exactly as an in-app password change does.
    user.passwordChangedAt = new Date();
    await user.save();

    resetToken.isUsed = true;
    await resetToken.save();

    await PasswordReset.invalidateOutstandingTokens(user._id);

    logger.info(`Password reset completed for user ${user._id}`);
    return res.status(200).json({
      success: true,
      message: "Password has been reset successfully",
    });
  } catch (error) {
    logger.error(`Password reset error: ${error.message}`, { error });
    return res.status(500).json({
      success: false,
      message: "Failed to reset password",
    });
  }
};
