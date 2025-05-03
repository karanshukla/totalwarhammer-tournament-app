import { toaster } from "@/shared/ui/Toaster";
import { apiConfig } from "@/core/config/apiConfig";
import { httpClient } from "@/core/api/httpClient";
import { useUserStore } from "@/shared/stores/userStore";
import { PKCEAuthService } from "@/core/auth/pkceAuthService";
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

export interface TokenResponse {
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
    // We can still use PKCE for enhanced security, even with sessions
    const { codeChallenge, state } = await PKCEAuthService.initiatePKCEFlow();

    // Store rememberMe preference in session storage to retrieve later
    if (data.rememberMe) {
      sessionStorage.setItem("pkce_remember_me", "true");
    }

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
        description: data.rememberMe
          ? "Welcome back! You'll stay signed in for 7 days."
          : "Welcome back!",
        type: "success",
      });
    } else {
      toaster.create({
        title: "Login Failed",
        description:
          responseData.message || "Invalid credentials or server error",
        type: "error",
      });
    }

    return responseData;
  } catch (error) {
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
    // With session-based auth, this still exchanges the code but establishes a session instead of returning a JWT
    return await httpClient.post<TokenResponse>(apiConfig.endpoints.token, {
      grant_type: "authorization_code",
      code,
      code_verifier: codeVerifier,
    });
  } catch (error) {
    console.error("Error during authentication:", error);
    throw error;
  }
};

/**
 * Logs out the current user by making a request to the server
 * to destroy the session and clears the local user state
 * @returns Promise that resolves when logout is complete
 */
export const logoutUser = async (): Promise<{
  success: boolean;
  message: string;
}> => {
  try {
    // Using POST method for logout to avoid CSRF issues with DELETE
    const response = await httpClient.post<{
      success: boolean;
      message: string;
    }>(apiConfig.endpoints.logout);

    // Always clear the local user state, even if server response fails
    const { clearUser } = useUserStore.getState();
    clearUser();

    if (response.success) {
      toaster.create({
        title: "Logged out",
        description: "You're now logged out. See you next time!",
        type: "success",
      });
    }

    return response;
  } catch (error) {
    // Still clear the user state even on error
    const { clearUser } = useUserStore.getState();
    clearUser();

    toaster.create({
      title: "Logout Issue",
      description:
        "You've been logged out locally, but there was an issue with the server.",
      type: "warning",
    });

    console.error("Logout error:", error);
    return { success: true, message: "Logged out locally" };
  }
};
