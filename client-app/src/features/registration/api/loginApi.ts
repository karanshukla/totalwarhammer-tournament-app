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
    expiresAt?: number;
  };
}

export const loginUser = async (data: LoginData): Promise<LoginResponse> => {
  try {
    const responseData = await httpClient.post<LoginResponse>(
      apiConfig.endpoints.login,
      data
    );

    if (responseData.success) {
      const { setUser } = useUserStore.getState();

      // The token is now stored in an HttpOnly cookie by the server
      // We only need to store user information in our state
      setUser({
        id: responseData.data?.id || "",
        email: responseData.data?.email || "",
        username: responseData.data?.username || "",
        isAuthenticated: true,
        expiresAt: responseData.data?.expiresAt,
        isGuest: false,
      });

      toaster.create({
        title: `Successfully logged in as ${
          responseData.data?.email || data.email
        }`,
        description: "Welcome back!",
        type: "success",
      });
    } else {
      console.error("Login failed:", responseData.message);
      toaster.create({
        title: "Login Failed",
        description:
          responseData.message || "Invalid credentials or server error",
        type: "error",
      });
    }

    return responseData;
  } catch (error) {
    console.error("Error logging in:", error);
    toaster.create({
      title: "Login Failed",
      description:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred during login.",
      type: "error",
    });
    throw error;
  }
};
