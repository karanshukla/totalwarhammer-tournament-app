import { toaster } from "@/shared/ui/toaster";
import { apiConfig } from "@/core/config/apiConfig";
import { httpClient } from "@/core/api/httpClient";
import { useUserStore } from "@/shared/stores/userStore";
import { PKCEAuthService } from "@/core/auth/services/pkceAuthService";

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
    state?: string;
    authorizationCode?: string;
  };
}

export const loginUser = async (data: LoginData): Promise<LoginResponse> => {
  try {
    const { codeChallenge, state } = PKCEAuthService.initiatePKCEFlow();

    const responseData = await httpClient.post<LoginResponse>(
      apiConfig.endpoints.login,
      {
        ...data,
        codeChallenge,
        codeChallengeMethod: "S256",
        state,
      }
    );

    if (responseData.success) {
      if (
        responseData.data?.state &&
        !PKCEAuthService.verifyAuthState(responseData.data.state)
      ) {
        throw new Error("Security error: State validation failed");
      }

      if (responseData.data?.authorizationCode) {
        const codeVerifier = PKCEAuthService.getAndClearCodeVerifier();
        if (!codeVerifier) {
          throw new Error("Code verifier not found");
        }

        const tokenResponse = await exchangeCodeForToken(
          responseData.data.authorizationCode,
          codeVerifier
        );

        responseData.data = {
          ...responseData.data,
          ...tokenResponse.data,
        };
      }

      const { setUser } = useUserStore.getState();

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

const exchangeCodeForToken = async (code: string, codeVerifier: string) => {
  try {
    return await httpClient.post<any>(apiConfig.endpoints.token, {
      grant_type: "authorization_code",
      code,
      code_verifier: codeVerifier,
    });
  } catch (error) {
    console.error("Error exchanging code for token:", error);
    throw error;
  }
};
