import { toaster } from "@/shared/ui/Toaster";
import { apiConfig } from "@/core/config/apiConfig";
import { httpClient } from "@/core/api/httpClient";
import { useUserStore } from "@/shared/stores/userStore";

export interface GuestUserResponse {
  success: boolean;
  message: string;
  data?: {
    id: string;
    username: string;
    email: string;
    isGuest: boolean;
    token: string;
    expiresAt: number;
  };
}

export const createGuestUser = async (): Promise<GuestUserResponse> => {
  try {
    const responseData = await httpClient.post<GuestUserResponse>(
      apiConfig.endpoints.guest,
      {}
    );

    if (responseData.success && responseData.data) {
      // Calculate max-age in seconds based on expiration time
      const now = Date.now();
      const expiresAt = responseData.data.expiresAt || now + 48 * 3600 * 1000; // Default 48 hours if not provided

      // Get the store's setter directly
      const { setUser } = useUserStore.getState();

      // Explicitly set all required properties for a guest user
      setUser({
        id: responseData.data.id || "",
        email: responseData.data.email || "",
        username: responseData.data.username || "",
        expiresAt: expiresAt,
        isGuest: true,
        isAuthenticated: true, // Explicitly set as authenticated
      });

      toaster.create({
        title: `Created guest account`,
        description: "You can browse as a guest for the next 48 hours",
        type: "success",
      });
    } else {
      throw new Error("Failed to create guest user account");
    }

    return responseData;
  } catch (error) {
    console.error("Error creating guest account:", error);
    toaster.create({
      title: "Failed to create guest account",
      description: error instanceof Error ? error.message : "An error occurred",
      type: "error",
    });
    throw error;
  }
};
