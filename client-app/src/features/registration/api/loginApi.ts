import { toaster } from "@/shared/ui/toaster";
import { apiConfig } from "@/core/config/apiConfig";
import { httpClient } from "@/core/api/httpClient";
import { useUserStore } from "@/shared/stores/userStore";

// TODO - Implement CSRF Protection

export interface LoginData {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data?: { 
    id: string;
    email: string;
    token?: string;
  };
}

export const loginUser = async (data: LoginData): Promise<LoginResponse> => {
  try {
    const responseData = await httpClient.post<LoginResponse>(
      apiConfig.endpoints.login,
      data
    );

    if (responseData.data?.token) {
      document.cookie = `jwt=${responseData.data.token}; path=/; max-age=3600; secure; samesite=strict`;
    }
    

    const { setUser } = useUserStore.getState();
    setUser({
      id: responseData.data?.id || "",
       email: responseData.data?.email || "",
     });
     
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