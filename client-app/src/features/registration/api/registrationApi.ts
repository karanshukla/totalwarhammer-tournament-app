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

export const registerUser = async (data: RegistrationData): Promise<RegistrationResponse> => {
  try {
    const responseData = await httpClient.post<RegistrationResponse>(
      apiConfig.endpoints.register, 
      data
    );
    
    toaster.create({
      title: `Successfully registered with the Username ${data.username}`,
      description: "You will be notified when the app is ready",
      type: "success",
    });
    
    return responseData;
  } catch (error) {
    console.error('Error registering with the server:', error);
    toaster.create({
      title: "Registration Failed",
      description: error instanceof Error ? error.message : 'Registration failed for an unknown reason',
      type: "error",
    });
    throw error;
  }
};