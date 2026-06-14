/**
 * Branch coverage for authenticationApi.ts – logoutUser:
 * - Success path, response.success=true → clearUser + success toast
 * - Success path, response.success=false → clearUser only, no success toast
 * - Catch path → clearUser + warning toast + returns { success: true, message: "Logged out locally" }
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPost, mockClearUser, mockToasterCreate } = vi.hoisted(() => ({
  mockPost: vi.fn(),
  mockClearUser: vi.fn(),
  mockToasterCreate: vi.fn(),
}));

vi.mock("@/core/api/httpClient", () => ({
  httpClient: { post: mockPost },
}));

vi.mock("@/shared/stores/userStore", () => ({
  useUserStore: { getState: vi.fn(() => ({ clearUser: mockClearUser })) },
}));

vi.mock("@/shared/ui/Toaster", () => ({
  toaster: { create: mockToasterCreate },
}));

vi.mock("@/core/auth/pkceAuthService", () => ({
  PKCEAuthService: {
    initiatePKCEFlow: vi.fn().mockResolvedValue({ codeChallenge: "cc", state: "st" }),
    verifyAuthState: vi.fn().mockReturnValue(true),
    getAndClearCodeVerifier: vi.fn().mockReturnValue("verifier"),
  },
}));

import { logoutUser } from "@/features/authentication/api/authenticationApi";

describe("logoutUser – success path (response.success=true)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls clearUser and shows success toast", async () => {
    mockPost.mockResolvedValueOnce({ success: true, message: "logged out" });
    const result = await logoutUser();
    expect(mockClearUser).toHaveBeenCalled();
    expect(mockToasterCreate).toHaveBeenCalledWith(
      expect.objectContaining({ type: "success" }),
    );
    expect(result).toEqual({ success: true, message: "logged out" });
  });
});

describe("logoutUser – success path (response.success=false)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls clearUser but does NOT show success toast when response.success is false", async () => {
    mockPost.mockResolvedValueOnce({ success: false, message: "nope" });
    const result = await logoutUser();
    expect(mockClearUser).toHaveBeenCalled();
    expect(mockToasterCreate).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "success" }),
    );
    expect(result.success).toBe(false);
  });
});

describe("logoutUser – catch path", () => {
  beforeEach(() => vi.clearAllMocks());

  it("clears user locally and shows warning toast when server throws", async () => {
    mockPost.mockRejectedValueOnce(new Error("Server down"));
    const result = await logoutUser();
    expect(mockClearUser).toHaveBeenCalled();
    expect(mockToasterCreate).toHaveBeenCalledWith(
      expect.objectContaining({ type: "warning" }),
    );
    expect(result).toEqual({ success: true, message: "Logged out locally" });
  });
});
