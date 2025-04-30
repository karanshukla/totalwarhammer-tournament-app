import { toaster } from "@/shared/ui/toaster";
import { apiConfig } from "@/core/config/apiConfig";
import { httpClient } from "@/core/api/httpClient";

export interface RegistrationData {
  username: string;
  email: string;
  password?: string;
}

export interface RegistrationResponse {
  success: boolean;
  message: string;
  data?: {
    id: string;
    username: string;
    email: string;
  };
}

export const registerUser = async (
  data: RegistrationData
): Promise<RegistrationResponse> => {
  try {
    const responseData = await httpClient.post<RegistrationResponse>(
      apiConfig.endpoints.register,
      data
    );

    toaster.create({
      title: `Successfully registered with the Username ${data.username}`,
      type: "success",
    });

    return responseData;
  } catch (error) {
    console.error("Error registering with the server:", error);
    toaster.create({
      title: "Registration Failed",
      description:
        error instanceof Error
          ? error.message
          : "Failed to register your account",
      type: "error",
    });
    throw error;
  }
};

export const userExists = async (username: string): Promise<boolean> => {
  try {
    const response = await httpClient.post<{
      data: any;
      exists: boolean;
    }>(apiConfig.endpoints.userExists, { username });
    return response.data.exists;
  } catch (error) {
    console.error("Error checking if user exists:", error);
    throw error;
  }
};
