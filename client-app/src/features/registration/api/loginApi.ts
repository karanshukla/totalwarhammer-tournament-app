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
  };
}

/**
 * Login user with PKCE enhancement for security
 */
export const loginUser = async (data: LoginData): Promise<LoginResponse> => {
  try {
    // Initialize PKCE flow to get code challenge and state
    const { codeChallenge, state } = PKCEAuthService.initiatePKCEFlow();

    // Enhanced login request with PKCE parameters
    const responseData = await httpClient.post<LoginResponse>(
      apiConfig.endpoints.login,
      {
        ...data,
        codeChallenge,
        codeChallengeMethod: 'S256', // SHA-256 method
        state
      }
    );

    if (responseData.success) {
      // Verify the returned state matches the stored state
      if (responseData.data?.state && !PKCEAuthService.verifyAuthState(responseData.data.state)) {
        throw new Error("Security error: State validation failed");
      }
      
      // If server returns an auth code, exchange it for a token
      if (responseData.data?.authorizationCode) {
        const codeVerifier = PKCEAuthService.getAndClearCodeVerifier();
        if (!codeVerifier) {
          throw new Error("Code verifier not found");
        }
        
        // Exchange authorization code for token
        const tokenResponse = await exchangeCodeForToken(
          responseData.data.authorizationCode,
          codeVerifier
        );
        
        // Update response data with token response
        responseData.data = {
          ...responseData.data,
          ...tokenResponse.data
        };
      }

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

/**
 * Exchange authorization code for token using PKCE code verifier
 */
const exchangeCodeForToken = async (code: string, codeVerifier: string) => {
  try {
    return await httpClient.post<any>(
      apiConfig.endpoints.token,
      {
        grant_type: 'authorization_code',
        code,
        code_verifier: codeVerifier
      }
    );
  } catch (error) {
    console.error("Error exchanging code for token:", error);
    throw error;
  }
};
