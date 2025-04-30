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
    const responseData = await httpClient.post<LoginResponse>(
      apiConfig.endpoints.login,
      data
    );

    if (responseData.data?.token) {
      // Calculate max-age in seconds based on expiration time
      const now = Date.now();
      const expiresAt = responseData.data.expiresAt || now + (3600 * 1000); // Default 1 hour if not provided
      const maxAge = Math.floor((expiresAt - now) / 1000);
      
      // Set JWT in cookie with appropriate expiration
      document.cookie = `jwt=${responseData.data.token}; path=/; max-age=${maxAge}; secure; samesite=strict`;
      
      // Save user info to store
      const { setUser } = useUserStore.getState();
      setUser({
        id: responseData.data.id || "",
        email: responseData.data.email || "",
        username: responseData.data.username || "",
        isAuthenticated: true,
        expiresAt: responseData.data.expiresAt,
        isGuest: false
      });
    }
    
    toaster.create({
      title: `Successfully logged in as ${data.email}`,
      description: "Welcome back!", 
      type: "success",
    });

    return responseData;
  } catch (error) {
    console.error('Error logging in:', error);
    toaster.create({
      title: "Login Failed",
      description: error instanceof Error ? error.message : 'Failed to log in to your account',
      type: "error",
    });
    throw error;
  }
};