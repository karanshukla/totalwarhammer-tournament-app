import { toaster } from "@/shared/ui/toaster";
import { apiConfig } from "@/core/config/apiConfig";
import { httpClient } from "@/core/api/httpClient";

/**
 * API response interfaces
 */
export interface PasswordResetResponse {
  success: boolean;
  message: string;
}

export interface TokenVerificationResponse {
  success: boolean;
  message: string;
  data?: {
    userId: string;
    validUntil: number;
  };
}

/**
 * Request password reset email for the specified user email
 * @param email User's email address
 */
export const requestPasswordReset = async (
  email: string
): Promise<PasswordResetResponse> => {
  try {
    const response = await httpClient.post<PasswordResetResponse>(
      `${apiConfig.endpoints.passwordReset}/request`,
      { email }
    );

    if (response.success) {
      toaster.create({
        title: "Password Reset Email Sent",
        description:
          "Check your email for instructions to reset your password.",
        type: "success",
      });
    } else {
      throw new Error(
        response.message || "Failed to send password reset email"
      );
    }

    return response;
  } catch (error) {
    toaster.create({
      title: "Failed to Send Reset Email",
      description:
        error instanceof Error
          ? error.message
          : "There was an error sending the password reset email. Please try again.",
      type: "error",
    });
    throw error;
  }
};

/**
 * Verify if a password reset token is valid
 * @param token The reset token to verify
 */
export const verifyResetToken = async (
  token: string
): Promise<TokenVerificationResponse> => {
  try {
    const response = await httpClient.post<TokenVerificationResponse>(
      `${apiConfig.endpoints.passwordReset}/verify`,
      { token }
    );

    return response;
  } catch (error) {
    toaster.create({
      title: "Invalid or Expired Token",
      description:
        "The password reset link is invalid or has expired. Please request a new one.",
      type: "error",
    });
    throw error;
  }
};

/**
 * Reset password using token and new password
 * @param token The reset token
 * @param newPassword The new password to set
 */
export const resetPassword = async (
  token: string,
  newPassword: string
): Promise<PasswordResetResponse> => {
  try {
    const response = await httpClient.post<PasswordResetResponse>(
      `${apiConfig.endpoints.passwordReset}/reset`,
      { token, newPassword }
    );

    if (response.success) {
      toaster.create({
        title: "Password Reset Successful",
        description:
          "Your password has been reset. You can now login with your new password.",
        type: "success",
      });
    } else {
      throw new Error(response.message || "Failed to reset password");
    }

    return response;
  } catch (error) {
    toaster.create({
      title: "Failed to Reset Password",
      description:
        error instanceof Error
          ? error.message
          : "There was an error resetting your password. Please try again.",
      type: "error",
    });
    throw error;
  }
};
