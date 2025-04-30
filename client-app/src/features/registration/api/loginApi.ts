import { toaster } from "@/shared/ui/toaster";
import { apiConfig } from "@/core/config/apiConfig";
import { httpClient } from "@/core/api/httpClient";
import { useUserStore } from "@/shared/stores/userStore";

// TODO - Implement CSRF Protection

export interface LoginData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data?: {
    id: string;
    email: string;
    username: string;
    token?: string;
    expiresAt?: number; // New property from server to know when token expires
  };
}

export const loginUser = async (data: LoginData): Promise<LoginResponse> => {
  try {
    // Correct the generic type parameter to LoginResponse
    const responseData = await httpClient.post<LoginResponse>(
      apiConfig.endpoints.login,
      data
    );

    // Access response data directly based on LoginResponse structure
    if (responseData.success && responseData.data?.token) {
      // Calculate max-age in seconds based on expiration time
      const now = Date.now();
      // Use responseData.data.expiresAt directly
      const expiresAt = responseData.data.expiresAt || now + 3600 * 1000; // Default 1 hour if not provided
      const maxAge = Math.floor((expiresAt - now) / 1000);

      // Set JWT in cookie with appropriate expiration
      // Use responseData.data.token directly
      document.cookie = `jwt=${responseData.data.token}; path=/; max-age=${maxAge}; secure; samesite=strict`;

      // Save user info to store
      const { setUser } = useUserStore.getState();
      // Use responseData.data properties directly
      setUser({
        id: responseData.data.id || "",
        email: responseData.data.email || "",
        username: responseData.data.username || "",
        isAuthenticated: true,
        expiresAt: responseData.data.expiresAt,
        isGuest: false,
      });

      toaster.create({
        // Use responseData.data.email if available, otherwise fallback to input data.email
        title: `Successfully logged in as ${
          responseData.data.email || data.email
        }`,
        description: "Welcome back!",
        type: "success",
      });
    } else if (!responseData.success) {
      // Handle unsuccessful login based on response message
      console.error("Login failed:", responseData.message);
      toaster.create({
        title: "Login Failed",
        description:
          responseData.message || "Invalid credentials or server error",
        type: "error",
      });
      // Optionally, throw an error or return the unsuccessful response
      // throw new Error(responseData.message || "Login failed");
    }

    return responseData;
  } catch (error) {
    console.error("Error logging in:", error);
    toaster.create({
      title: "Login Failed",
      description:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred during login.", // More generic message
      type: "error",
    });
    // Re-throw the error so the calling component knows the login failed
    throw error;
  }
};
