/**
 * Branch coverage for passwordResetApi.ts:
 * requestPasswordReset:
 *   - success=true → success toast returned
 *   - success=false → throws, error toast (Error instance)
 *   - httpClient throws (non-Error) → error toast with generic message
 * verifyResetToken:
 *   - success → returns response
 *   - httpClient throws → error toast, rethrows
 * resetPassword:
 *   - success=true → success toast
 *   - success=false → throws (Error instance), error toast
 *   - httpClient throws (non-Error) → generic error toast
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPost, mockToasterCreate } = vi.hoisted(() => ({
  mockPost: vi.fn(),
  mockToasterCreate: vi.fn(),
}));

vi.mock("@/core/api/httpClient", () => ({
  httpClient: { post: mockPost },
}));

vi.mock("@/shared/ui/Toaster", () => ({
  toaster: { create: mockToasterCreate },
}));

import {
  requestPasswordReset,
  verifyResetToken,
  resetPassword,
} from "@/features/authentication/api/passwordResetApi";

describe("requestPasswordReset", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows success toast and returns response when success=true", async () => {
    mockPost.mockResolvedValueOnce({ success: true, message: "sent" });
    const result = await requestPasswordReset("a@b.com");
    expect(result.success).toBe(true);
    expect(mockToasterCreate).toHaveBeenCalledWith(
      expect.objectContaining({ type: "success" }),
    );
  });

  it("throws and shows error toast when success=false (else branch)", async () => {
    mockPost.mockResolvedValueOnce({ success: false, message: "No user found" });
    await expect(requestPasswordReset("x@y.com")).rejects.toThrow("No user found");
    expect(mockToasterCreate).toHaveBeenCalledWith(
      expect.objectContaining({ type: "error", description: "No user found" }),
    );
  });

  it("shows generic error description for non-Error in catch (line 46 false)", async () => {
    mockPost.mockRejectedValueOnce("network glitch");
    await expect(requestPasswordReset("x@y.com")).rejects.toBe("network glitch");
    expect(mockToasterCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "error",
        description:
          "There was an error sending the password reset email. Please try again.",
      }),
    );
  });
});

describe("verifyResetToken", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns response without showing a toast on success", async () => {
    mockPost.mockResolvedValueOnce({ success: true, data: { userId: "u1", validUntil: 9999 } });
    const result = await verifyResetToken("tok123");
    expect(result.success).toBe(true);
    expect(result.data?.userId).toBe("u1");
    expect(mockToasterCreate).not.toHaveBeenCalled();
  });

  it("shows error toast and rethrows when httpClient throws", async () => {
    mockPost.mockRejectedValueOnce(new Error("Expired token"));
    await expect(verifyResetToken("bad-tok")).rejects.toThrow("Expired token");
    expect(mockToasterCreate).toHaveBeenCalledWith(
      expect.objectContaining({ type: "error" }),
    );
  });
});

describe("resetPassword", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows success toast and returns response when success=true", async () => {
    mockPost.mockResolvedValueOnce({ success: true, message: "done" });
    const result = await resetPassword("tok", "newpass123");
    expect(result.success).toBe(true);
    expect(mockToasterCreate).toHaveBeenCalledWith(
      expect.objectContaining({ type: "success" }),
    );
  });

  it("throws and shows error toast with message when success=false (Error instance)", async () => {
    mockPost.mockResolvedValueOnce({ success: false, message: "Token invalid" });
    await expect(resetPassword("bad-tok", "newpass")).rejects.toThrow("Token invalid");
    expect(mockToasterCreate).toHaveBeenCalledWith(
      expect.objectContaining({ type: "error", description: "Token invalid" }),
    );
  });

  it("shows generic error description for non-Error in catch (line 111 false)", async () => {
    mockPost.mockRejectedValueOnce(42);
    await expect(resetPassword("tok", "newpass")).rejects.toBe(42);
    expect(mockToasterCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "error",
        description: "There was an error resetting your password. Please try again.",
      }),
    );
  });
});
