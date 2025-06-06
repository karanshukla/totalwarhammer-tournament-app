import { toaster } from "@/shared/ui/Toaster";
import { apiConfig } from "@/core/config/apiConfig";
import { httpClient } from "@/core/api/httpClient";
import { useUserStore } from "@/shared/stores/userStore";

export interface UpdateUsernameRequest {
  username: string;
}

export interface UpdatePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface AccountUpdateResponse {
  success: boolean;
  message: string;
  data?: {
    id: string;
    username: string;
    email: string;
  };
}

/**
 * Refreshes the user's session by making a request to fetch CSRF token
 * This keeps the session active and helps prevent authentication issues
 */
export const refreshSession = async (): Promise<boolean> => {
  try {
    // This will make a request to the server which keeps the session active
    const result = await httpClient.checkSessionStatus();
    return result.valid;
  } catch (error) {
    console.error("Failed to refresh session:", error);
    return false;
  }
};

/**
 * Updates the username of an authenticated user
 * @param username New username to set
 * @returns Promise with response from the server
 */
export const updateUsername = async (
  username: string
): Promise<AccountUpdateResponse> => {
  try {
    // Note: httpClient.post() will internally validate the session for sensitive endpoints.
    const responseData = await httpClient.post<AccountUpdateResponse>(
      apiConfig.endpoints.updateUsername,
      { username }
    );

    if (responseData.success) {
      // Update the user in the store
      const { setUser } = useUserStore.getState();
      setUser({
        username: responseData.data?.username || username,
      });

      toaster.create({
        title: "Username Updated",
        description: "Your username has been updated successfully",
        type: "success",
      });
    } else {
      throw new Error(responseData.message || "Failed to update username");
    }

    return responseData;
  } catch (error) {
    toaster.create({
      title: "Failed to Update Username",
      description: error instanceof Error ? error.message : "An error occurred",
      type: "error",
    });
    throw error;
  }
};

/**
 * Updates the password of an authenticated user
 * @param data Object containing current password, new password, and confirmation
 * @returns Promise with response from the server
 */
export const updatePassword = async (
  data: UpdatePasswordRequest
): Promise<AccountUpdateResponse> => {
  try {
    // Note: httpClient.post() will internally validate the session for sensitive endpoints.
    const responseData = await httpClient.post<AccountUpdateResponse>(
      apiConfig.endpoints.updatePassword,
      data
    );

    if (responseData.success) {
      toaster.create({
        title: "Password Updated",
        description: "Your password has been changed successfully",
        type: "success",
      });
    } else {
      throw new Error(responseData.message || "Failed to update password");
    }

    return responseData;
  } catch (error) {
    toaster.create({
      title: "Failed to Update Password",
      description: error instanceof Error ? error.message : "An error occurred",
      type: "error",
    });
    throw error;
  }
};
