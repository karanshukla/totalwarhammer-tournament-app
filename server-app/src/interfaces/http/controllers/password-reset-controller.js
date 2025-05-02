import User from "../../../domain/models/user.js";
import PasswordReset from "../../../domain/models/password-reset.js";
import bcrypt from "bcrypt";
import emailService from "../../../infrastructure/services/email-service.js";
import { clientUrl } from "../../../infrastructure/config/env.js";

export const sendPasswordResetEmail = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email format
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email address",
      });
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Create password reset token
    const passwordResetToken = await PasswordReset.createResetToken(user._id);

    // Send password reset email
    const resetLink = `${clientUrl}/reset-password?token=${passwordResetToken.resetKey}`;
    await emailService.sendEmail({
      to: email,
      subject: "Password Reset Request",
      text: `Click the link to reset your password: ${resetLink}`,
      html: `<p>Click the link to reset your password:</p><a href="${resetLink}">${resetLink}</a>`,
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

    // Check if token exists and is valid
    const resetToken = await PasswordReset.validateResetToken(token);

    if (!resetToken) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    // Return success with token validity
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

    // Validate the password
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    // Check if token exists and is valid
    const resetToken = await PasswordReset.validateResetToken(token);

    if (!resetToken) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    // Get the user associated with the token
    const user = await User.findById(resetToken.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user's password
    user.password = hashedPassword;
    await user.save();

    // Mark the token as used
    resetToken.isUsed = true;
    await resetToken.save();

    // Return success
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
