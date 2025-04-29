import { toaster } from "@/shared/ui/toaster";
import { apiConfig } from "@/core/config/apiConfig";
import { httpClient } from "@/core/api/httpClient";

// TODO - Implement CSRF Protection

export interface LoginData {
  email: string;
  password: string;
}

// Rename and potentially update interface for login response
export interface LoginResponse {
  success: boolean;
  message: string;
  data?: { // Adjust based on actual API response for login
    id: string;
    username: string;
    email: string;
    token?: string;
  };
}

// Rename function to loginUser and update parameters/return type
export const loginUser = async (data: LoginData): Promise<LoginResponse> => {
  try {
    const responseData = await httpClient.post<LoginResponse>(
      apiConfig.endpoints.login,
      data
    );

    // Update success toaster message
    toaster.create({
      title: `Successfully logged in as ${data.email}`, // Update title
      description: "Welcome back!", // Update description
      type: "success",
    });

    return responseData;
  } catch (error) {
    // Update error logging message
    console.error('Error logging in:', error);
    // Update error toaster message
    toaster.create({
      title: "Login Failed",
      description: error instanceof Error ? error.message : 'Failed to log in to your account',
      type: "error",
    });
    throw error;
  }
};