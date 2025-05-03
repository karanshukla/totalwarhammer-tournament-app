import { toaster } from "@/shared/ui/Toaster";
import { apiConfig } from "@/core/config/apiConfig";
import { httpClient } from "@/core/api/httpClient";
import { loginUser } from "./loginApi";
import { useUserStore } from "@/shared/stores/userStore";

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

    // Auto-login the user after successful registration
    try {
      if (data.password) {
        await loginUser({
          email: data.email,
          password: data.password,
        });
      } else {
        // For cases where password might not be required or provided
        // Set the user in the store using the registration response
        const { setUser } = useUserStore.getState();
        setUser({
          id: responseData.data?.id || "",
          email: data.email,
          username: data.username,
          isAuthenticated: true,
        });
      }
    } catch (loginError) {
      console.error("Auto-login after registration failed:", loginError);
      // Don't throw error here, as registration was successful
    }

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

export const userExists = async (identifier: string): Promise<boolean> => {
  try {
    const response = await httpClient.get<{
      success: boolean;
      message: string;
      data: {
        exists: boolean;
      };
    }>(apiConfig.endpoints.userExists, {
      params: { identifier },
    });

    return response.data.exists;
  } catch (error) {
    console.error("Error checking if user exists:", error);
    throw error;
  }
};
