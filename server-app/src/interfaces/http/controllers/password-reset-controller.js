import bcrypt from "bcrypt";

import PasswordReset from "../../../domain/models/password-reset.js";
import User from "../../../domain/models/user.js";
import { clientUrl } from "../../../infrastructure/config/env.js";
import { createPasswordResetEmail } from "../../../infrastructure/email-templates/password-reset-template.js";
import EmailService from "../../../infrastructure/services/email-service.js";

const emailService = new EmailService();

export const sendPasswordResetEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email address",
      });
    }

    const user = await User.findOne({ email: { $eq: email } });
    if (!user) {
      return res.status(200).json({
        success: true,
        message: "Password reset email sent successfully",
      });
    }

    const passwordResetToken = await PasswordReset.createResetToken(user._id);
    const resetLink = `${clientUrl}/reset-password?token=${passwordResetToken.resetKey}`;
    const emailContent = createPasswordResetEmail(resetLink);

    await emailService.sendEmail({
      to: email,
      ...emailContent,
    });

    return res.status(200).json({
      success: true,
      message: "Password reset email sent successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to send password reset email",
      error: error.message,
    });
  }
};

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
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Token is valid",
      data: {
        userId: resetToken.userId,
        validUntil: resetToken.createdAt.getTime() + 3600000, // Token expiry time (1 hour)
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to verify reset token",
      error: error.message,
    });
  }
};

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
        message: "Password must be at least 6 characters long",
      });
    }

    const resetToken = await PasswordReset.validateResetToken(token);

    if (!resetToken) {
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
    await user.save();

    resetToken.isUsed = true;
    await resetToken.save();

    return res.status(200).json({
      success: true,
      message: "Password has been reset successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to reset password",
      error: error.message,
    });
  }
};
