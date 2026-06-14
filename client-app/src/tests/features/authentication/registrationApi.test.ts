/**
 * Branch coverage for registrationApi.ts:
 * registerUser:
 *   - success + data.password → calls loginUser auto-login
 *   - success + NO password → uses setUser from store directly (else branch line 43)
 *   - success + loginUser throws → warning toast (inner catch line 54)
 *   - httpClient.post throws → outer catch, error toast (Error instance, line 68)
 *   - httpClient.post throws (non-Error) → generic description (line 69)
 * userExists:
 *   - returns true when data.exists=true
 *   - returns false when data.exists=false
 *   - rethrows when httpClient throws
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPost, mockGet, mockSetUser, mockToasterCreate, mockLoginUser } = vi.hoisted(() => ({
  mockPost: vi.fn(),
  mockGet: vi.fn(),
  mockSetUser: vi.fn(),
  mockToasterCreate: vi.fn(),
  mockLoginUser: vi.fn(),
}));

vi.mock("@/core/api/httpClient", () => ({
  httpClient: { post: mockPost, get: mockGet },
}));

vi.mock("@/shared/stores/userStore", () => ({
  useUserStore: { getState: vi.fn(() => ({ setUser: mockSetUser })) },
}));

vi.mock("@/shared/ui/Toaster", () => ({
  toaster: { create: mockToasterCreate },
}));

vi.mock("@/features/authentication/api/authenticationApi", () => ({
  loginUser: mockLoginUser,
}));

import { registerUser, userExists } from "@/features/authentication/api/registrationApi";

describe("registerUser", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls loginUser auto-login when password is provided (line 38 true branch)", async () => {
    mockPost.mockResolvedValueOnce({
      success: true,
      data: { id: "u1", username: "Grimgork", email: "g@g.com" },
    });
    mockLoginUser.mockResolvedValueOnce({ success: true });
    const result = await registerUser({
      username: "Grimgork",
      email: "g@g.com",
      password: "hunter123",
    });
    expect(result.success).toBe(true);
    expect(mockLoginUser).toHaveBeenCalledWith({
      identifier: "g@g.com",
      password: "hunter123",
    });
    expect(mockToasterCreate).toHaveBeenCalledWith(expect.objectContaining({ type: "success" }));
  });

  it("sets user directly when no password is provided (line 43 else branch)", async () => {
    mockPost.mockResolvedValueOnce({
      success: true,
      data: { id: "u2", username: "NoPass", email: "np@g.com" },
    });
    await registerUser({ username: "NoPass", email: "np@g.com" });
    expect(mockLoginUser).not.toHaveBeenCalled();
    expect(mockSetUser).toHaveBeenCalledWith(
      expect.objectContaining({ username: "NoPass", isAuthenticated: true }),
    );
  });

  it("shows warning toast when auto-login throws (inner catch line 54)", async () => {
    mockPost.mockResolvedValueOnce({
      success: true,
      data: { id: "u3", username: "AutoFail", email: "af@g.com" },
    });
    mockLoginUser.mockRejectedValueOnce(new Error("Login error"));
    await registerUser({ username: "AutoFail", email: "af@g.com", password: "pass1234" });
    expect(mockToasterCreate).toHaveBeenCalledWith(
      expect.objectContaining({ type: "warning" }),
    );
  });

  it("shows error toast with message for Error instance in outer catch (line 68)", async () => {
    mockPost.mockRejectedValueOnce(new Error("Email already exists"));
    await expect(
      registerUser({ username: "Dup", email: "d@d.com", password: "pass1234" }),
    ).rejects.toThrow("Email already exists");
    expect(mockToasterCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "error",
        description: "Email already exists",
      }),
    );
  });

  it("shows generic description for non-Error in outer catch (line 69)", async () => {
    mockPost.mockRejectedValueOnce("raw error");
    await expect(
      registerUser({ username: "X", email: "x@x.com", password: "pass1234" }),
    ).rejects.toBe("raw error");
    expect(mockToasterCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "error",
        description: "Failed to register your account",
      }),
    );
  });
});

describe("userExists", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns true when server says exists=true", async () => {
    mockGet.mockResolvedValueOnce({ success: true, data: { exists: true } });
    const result = await userExists("existing@user.com");
    expect(result).toBe(true);
  });

  it("returns false when server says exists=false", async () => {
    mockGet.mockResolvedValueOnce({ success: true, data: { exists: false } });
    const result = await userExists("new@user.com");
    expect(result).toBe(false);
  });

  it("rethrows when httpClient throws", async () => {
    mockGet.mockRejectedValueOnce(new Error("Network error"));
    await expect(userExists("x@x.com")).rejects.toThrow("Network error");
  });
});
