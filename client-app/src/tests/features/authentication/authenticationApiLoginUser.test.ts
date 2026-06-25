/**
 * Branch coverage for authenticationApi.ts – loginUser and exchangeCodeForToken:
 * - Success path (no authorizationCode, no state) → setUser + success toast
 * - Success path with rememberMe=true → "30 days" toast description
 * - Success path with state in response that passes verifyAuthState
 * - State validation failing → throws "Security error: State validation failed"
 * - authorizationCode present + codeVerifier found → exchangeCodeForToken → setUser
 * - authorizationCode present + no codeVerifier → throws "Code verifier not found"
 * - responseData.success = false → error toast, no setUser
 * - httpClient.post throws → catch, error toast, re-throws
 * - exchangeCodeForToken internal error → second post throws
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockPost,
  mockSetUser,
  mockClearUser,
  mockToasterCreate,
  mockInitiatePKCEFlow,
  mockVerifyAuthState,
  mockGetAndClearCodeVerifier,
  mockResetCsrfToken,
} = vi.hoisted(() => ({
  mockPost: vi.fn(),
  mockSetUser: vi.fn(),
  mockClearUser: vi.fn(),
  mockToasterCreate: vi.fn(),
  mockInitiatePKCEFlow: vi.fn(),
  mockVerifyAuthState: vi.fn(),
  mockGetAndClearCodeVerifier: vi.fn(),
  mockResetCsrfToken: vi.fn(),
}));

vi.mock("@/core/api/httpClient", () => ({
  httpClient: { post: mockPost, resetCsrfToken: mockResetCsrfToken },
}));

vi.mock("@/shared/stores/userStore", () => ({
  useUserStore: {
    getState: vi.fn(() => ({ setUser: mockSetUser, clearUser: mockClearUser })),
  },
}));

vi.mock("@/shared/ui/Toaster", () => ({
  toaster: { create: mockToasterCreate },
}));

vi.mock("@/core/auth/pkceAuthService", () => ({
  PKCEAuthService: {
    initiatePKCEFlow: mockInitiatePKCEFlow,
    verifyAuthState: mockVerifyAuthState,
    getAndClearCodeVerifier: mockGetAndClearCodeVerifier,
  },
}));

vi.mock("@/core/config/apiConfig", () => ({
  apiConfig: {
    endpoints: {
      login: "/auth/login",
      token: "/auth/token",
      logout: "/auth/logout",
    },
  },
}));

import { loginUser } from "@/features/authentication/api/authenticationApi";

// Helper defaults
const defaultPKCE = { codeChallenge: "challenge123", state: "state-abc" };
const baseLoginData = { identifier: "grimgork@waaagh.com", password: "Waaagh1!" };

describe("loginUser – success path (no authorizationCode, no state in response)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInitiatePKCEFlow.mockResolvedValue(defaultPKCE);
  });

  it("calls setUser and creates a success toast on success", async () => {
    mockPost.mockResolvedValueOnce({
      success: true,
      message: "ok",
      data: { id: "u1", email: "g@g.com", username: "Grimgork" },
    });

    await loginUser(baseLoginData);

    expect(mockSetUser).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "u1",
        email: "g@g.com",
        username: "Grimgork",
        isAuthenticated: true,
        isGuest: false,
      }),
    );
    expect(mockResetCsrfToken).toHaveBeenCalled();
    expect(mockToasterCreate).toHaveBeenCalledWith(
      expect.objectContaining({ type: "success" }),
    );
  });

  it("sends codeChallenge and state from PKCEAuthService to the login endpoint", async () => {
    mockPost.mockResolvedValueOnce({
      success: true,
      message: "ok",
      data: { id: "u1", email: "g@g.com", username: "Grimgork" },
    });

    await loginUser(baseLoginData);

    expect(mockPost).toHaveBeenCalledWith(
      "/auth/login",
      expect.objectContaining({
        codeChallenge: "challenge123",
        state: "state-abc",
        codeChallengeMethod: "S256",
      }),
    );
  });

  it("returns the response data", async () => {
    const serverResponse = {
      success: true,
      message: "ok",
      data: { id: "u2", email: "x@x.com", username: "Luthor" },
    };
    mockPost.mockResolvedValueOnce(serverResponse);

    const result = await loginUser(baseLoginData);
    expect(result).toEqual(serverResponse);
  });
});

describe("loginUser – success path with rememberMe=true", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInitiatePKCEFlow.mockResolvedValue(defaultPKCE);
  });

  it("toast description says '30 days' when rememberMe is true", async () => {
    mockPost.mockResolvedValueOnce({
      success: true,
      message: "ok",
      data: { id: "u1", email: "g@g.com", username: "Grimgork" },
    });

    await loginUser({ ...baseLoginData, rememberMe: true });

    expect(mockToasterCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        description: "Welcome back! You'll stay signed in for 30 days.",
        type: "success",
      }),
    );
  });

  it("toast description says 'Welcome back!' when rememberMe is false", async () => {
    mockPost.mockResolvedValueOnce({
      success: true,
      message: "ok",
      data: { id: "u1", email: "g@g.com", username: "Grimgork" },
    });

    await loginUser({ ...baseLoginData, rememberMe: false });

    expect(mockToasterCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        description: "Welcome back!",
        type: "success",
      }),
    );
  });
});

describe("loginUser – success path with state validation passing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInitiatePKCEFlow.mockResolvedValue(defaultPKCE);
  });

  it("does not throw when state is present and verifyAuthState returns true", async () => {
    mockVerifyAuthState.mockReturnValue(true);
    mockPost.mockResolvedValueOnce({
      success: true,
      message: "ok",
      data: { id: "u1", email: "g@g.com", username: "Grimgork", state: "state-abc" },
    });

    await expect(loginUser(baseLoginData)).resolves.toBeDefined();
    expect(mockVerifyAuthState).toHaveBeenCalledWith("state-abc");
  });
});

describe("loginUser – state validation failing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInitiatePKCEFlow.mockResolvedValue(defaultPKCE);
  });

  it("throws 'Security error: State validation failed' when verifyAuthState returns false", async () => {
    mockVerifyAuthState.mockReturnValue(false);
    mockPost.mockResolvedValueOnce({
      success: true,
      message: "ok",
      data: { id: "u1", email: "g@g.com", username: "Grimgork", state: "tampered-state" },
    });

    await expect(loginUser(baseLoginData)).rejects.toThrow(
      "Security error: State validation failed",
    );
  });

  it("shows error toast when state validation fails", async () => {
    mockVerifyAuthState.mockReturnValue(false);
    mockPost.mockResolvedValueOnce({
      success: true,
      message: "ok",
      data: { id: "u1", email: "g@g.com", username: "Grimgork", state: "bad-state" },
    });

    await loginUser(baseLoginData).catch(() => {});
    expect(mockToasterCreate).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Login Failed", type: "error" }),
    );
  });
});

describe("loginUser – authorizationCode + codeVerifier found", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInitiatePKCEFlow.mockResolvedValue(defaultPKCE);
  });

  it("calls exchangeCodeForToken (second post) and merges token data into responseData", async () => {
    mockGetAndClearCodeVerifier.mockReturnValue("verifier-xyz");
    // First post: login → returns authorizationCode
    mockPost.mockResolvedValueOnce({
      success: true,
      message: "ok",
      data: {
        id: "u1",
        email: "g@g.com",
        username: "Grimgork",
        authorizationCode: "code-abc",
      },
    });
    // Second post: token exchange
    mockPost.mockResolvedValueOnce({
      success: true,
      message: "token ok",
      data: { id: "u1", email: "g@g.com", username: "Grimgork", expiresAt: 9999 },
    });

    await loginUser(baseLoginData);

    // Should have called post twice
    expect(mockPost).toHaveBeenCalledTimes(2);
    // Second call should be the token exchange
    expect(mockPost).toHaveBeenNthCalledWith(
      2,
      "/auth/token",
      expect.objectContaining({
        grant_type: "authorization_code",
        code: "code-abc",
        code_verifier: "verifier-xyz",
      }),
    );
    // setUser should be called with merged token data
    expect(mockSetUser).toHaveBeenCalledWith(
      expect.objectContaining({ expiresAt: 9999 }),
    );
  });
});

describe("loginUser – authorizationCode present + no codeVerifier", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInitiatePKCEFlow.mockResolvedValue(defaultPKCE);
  });

  it("throws 'Code verifier not found' when getAndClearCodeVerifier returns null", async () => {
    mockGetAndClearCodeVerifier.mockReturnValue(null);
    mockPost.mockResolvedValueOnce({
      success: true,
      message: "ok",
      data: {
        id: "u1",
        email: "g@g.com",
        username: "Grimgork",
        authorizationCode: "code-abc",
      },
    });

    await expect(loginUser(baseLoginData)).rejects.toThrow(
      "Code verifier not found",
    );
  });

  it("creates error toast when code verifier is missing", async () => {
    mockGetAndClearCodeVerifier.mockReturnValue(undefined);
    mockPost.mockResolvedValueOnce({
      success: true,
      message: "ok",
      data: {
        id: "u1",
        email: "g@g.com",
        username: "Grimgork",
        authorizationCode: "code-abc",
      },
    });

    await loginUser(baseLoginData).catch(() => {});
    expect(mockToasterCreate).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Login Failed", type: "error" }),
    );
  });
});

describe("loginUser – responseData.success = false", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInitiatePKCEFlow.mockResolvedValue(defaultPKCE);
  });

  it("creates error toast and does NOT call setUser when success is false", async () => {
    mockPost.mockResolvedValueOnce({
      success: false,
      message: "Invalid credentials",
    });

    const result = await loginUser(baseLoginData);

    expect(mockSetUser).not.toHaveBeenCalled();
    expect(mockToasterCreate).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Login Failed", type: "error" }),
    );
    expect(result.success).toBe(false);
  });

  it("uses the server message in the error toast description", async () => {
    mockPost.mockResolvedValueOnce({
      success: false,
      message: "Account locked",
    });

    await loginUser(baseLoginData);

    expect(mockToasterCreate).toHaveBeenCalledWith(
      expect.objectContaining({ description: "Account locked" }),
    );
  });
});

describe("loginUser – httpClient.post throws", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInitiatePKCEFlow.mockResolvedValue(defaultPKCE);
  });

  it("creates error toast and re-throws the error when post rejects", async () => {
    const networkError = new Error("Network timeout");
    mockPost.mockRejectedValueOnce(networkError);

    await expect(loginUser(baseLoginData)).rejects.toThrow("Network timeout");
    expect(mockToasterCreate).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Login Failed", type: "error" }),
    );
  });

  it("does NOT call setUser when post throws", async () => {
    mockPost.mockRejectedValueOnce(new Error("500"));

    await loginUser(baseLoginData).catch(() => {});
    expect(mockSetUser).not.toHaveBeenCalled();
  });

  it("uses the error message in the toast description when error is an Error instance", async () => {
    mockPost.mockRejectedValueOnce(new Error("Forbidden"));

    await loginUser(baseLoginData).catch(() => {});
    expect(mockToasterCreate).toHaveBeenCalledWith(
      expect.objectContaining({ description: "Forbidden" }),
    );
  });

  it("uses fallback description when thrown value is not an Error instance", async () => {
    mockPost.mockRejectedValueOnce("just a string error");

    await loginUser(baseLoginData).catch(() => {});
    expect(mockToasterCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        description: "An unexpected error occurred during login.",
      }),
    );
  });
});

describe("loginUser – exchangeCodeForToken internal error", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInitiatePKCEFlow.mockResolvedValue(defaultPKCE);
  });

  it("propagates error and shows error toast when token exchange fails", async () => {
    mockGetAndClearCodeVerifier.mockReturnValue("verifier-xyz");
    // First post succeeds with authorizationCode
    mockPost.mockResolvedValueOnce({
      success: true,
      message: "ok",
      data: {
        id: "u1",
        email: "g@g.com",
        username: "Grimgork",
        authorizationCode: "code-abc",
      },
    });
    // Second post (token exchange) fails
    mockPost.mockRejectedValueOnce(new Error("Token exchange failed"));

    await expect(loginUser(baseLoginData)).rejects.toThrow("Token exchange failed");
    expect(mockToasterCreate).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Login Failed", type: "error" }),
    );
  });

  it("does NOT call setUser when token exchange throws", async () => {
    mockGetAndClearCodeVerifier.mockReturnValue("verifier-xyz");
    mockPost.mockResolvedValueOnce({
      success: true,
      message: "ok",
      data: {
        id: "u1",
        email: "g@g.com",
        username: "Grimgork",
        authorizationCode: "code-abc",
      },
    });
    mockPost.mockRejectedValueOnce(new Error("Token exchange failed"));

    await loginUser(baseLoginData).catch(() => {});
    expect(mockSetUser).not.toHaveBeenCalled();
  });
});
