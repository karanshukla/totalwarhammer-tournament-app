/**
 * Branch coverage for guestApi.ts:
 * - createGuestUser success with expiresAt (line 28 || left side)
 * - createGuestUser success WITHOUT expiresAt → fallback 48h (line 28 || right side)
 * - createGuestUser !success → throws "Failed to create guest user account"
 * - createGuestUser catch: Error instance → error.message in toast
 * - createGuestUser catch: non-Error → "An error occurred" in toast
 * - updateGuestUsername success
 * - updateGuestUsername !success → throws "Failed to update guest user account"
 * - updateGuestUsername catch: Error instance
 * - updateGuestUsername catch: non-Error
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPost, mockSetUser, mockToasterCreate } = vi.hoisted(() => ({
  mockPost: vi.fn(),
  mockSetUser: vi.fn(),
  mockToasterCreate: vi.fn(),
}));

vi.mock("@/core/api/httpClient", () => ({
  httpClient: { post: mockPost },
}));

vi.mock("@/shared/stores/userStore", () => ({
  useUserStore: { getState: vi.fn(() => ({ setUser: mockSetUser })) },
}));

vi.mock("@/shared/ui/Toaster", () => ({
  toaster: { create: mockToasterCreate },
}));

import {
  createGuestUser,
  updateGuestUsername,
} from "@/features/authentication/api/guestApi";

describe("createGuestUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets user with server-provided expiresAt (line 28 true)", async () => {
    const futureTime = Date.now() + 1000;
    mockPost.mockResolvedValueOnce({
      success: true,
      data: {
        id: "u1",
        username: "g1",
        email: "",
        isGuest: true,
        expiresAt: futureTime,
      },
    });
    const result = await createGuestUser();
    expect(result.success).toBe(true);
    expect(mockSetUser).toHaveBeenCalledWith(
      expect.objectContaining({ expiresAt: futureTime }),
    );
    expect(mockToasterCreate).toHaveBeenCalledWith(
      expect.objectContaining({ type: "success" }),
    );
  });

  it("falls back to 48h default when expiresAt is missing (line 28 false)", async () => {
    const before = Date.now();
    mockPost.mockResolvedValueOnce({
      success: true,
      data: { id: "u2", username: "g2", email: "", isGuest: true },
    });
    await createGuestUser();
    const callArg = mockSetUser.mock.calls[0][0];
    expect(callArg.expiresAt).toBeGreaterThanOrEqual(
      before + 48 * 3600 * 1000 - 100,
    );
  });

  it("falls back to empty strings when id and username are absent", async () => {
    mockPost.mockResolvedValueOnce({
      success: true,
      data: {
        id: "",
        username: "",
        email: "",
        isGuest: true,
        expiresAt: Date.now() + 1000,
      },
    });
    await createGuestUser();
    expect(mockSetUser).toHaveBeenCalledWith(
      expect.objectContaining({ id: "", username: "", email: "" }),
    );
  });

  it("throws when success=false (line 47 else branch)", async () => {
    mockPost.mockResolvedValueOnce({ success: false, message: "no" });
    await expect(createGuestUser()).rejects.toThrow(
      "Failed to create guest user account",
    );
    expect(mockToasterCreate).toHaveBeenCalledWith(
      expect.objectContaining({ type: "error" }),
    );
  });

  it("uses error.message in toast for Error instance in catch (line 55 true)", async () => {
    mockPost.mockRejectedValueOnce(new Error("Network failure"));
    await expect(createGuestUser()).rejects.toThrow("Network failure");
    expect(mockToasterCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        description: "Network failure",
        type: "error",
      }),
    );
  });

  it("uses 'An error occurred' for non-Error in catch (line 55 false)", async () => {
    mockPost.mockRejectedValueOnce("plain string error");
    await expect(createGuestUser()).rejects.toBe("plain string error");
    expect(mockToasterCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        description: "An error occurred",
        type: "error",
      }),
    );
  });
});

describe("updateGuestUsername", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates user store and shows success toast on success", async () => {
    mockPost.mockResolvedValueOnce({
      success: true,
      data: { username: "newname" },
    });
    const result = await updateGuestUsername("newname");
    expect(result.success).toBe(true);
    expect(mockSetUser).toHaveBeenCalledWith({ username: "newname" });
    expect(mockToasterCreate).toHaveBeenCalledWith(
      expect.objectContaining({ type: "success" }),
    );
  });

  it("throws when success=false (else branch)", async () => {
    mockPost.mockResolvedValueOnce({ success: false, message: "bad" });
    await expect(updateGuestUsername("x")).rejects.toThrow(
      "Failed to update guest user account",
    );
    expect(mockToasterCreate).toHaveBeenCalledWith(
      expect.objectContaining({ type: "error" }),
    );
  });

  it("uses error.message in toast for Error instance in catch", async () => {
    mockPost.mockRejectedValueOnce(new Error("Username taken"));
    await expect(updateGuestUsername("taken")).rejects.toThrow(
      "Username taken",
    );
    expect(mockToasterCreate).toHaveBeenCalledWith(
      expect.objectContaining({ description: "Username taken", type: "error" }),
    );
  });

  it("uses 'An error occurred' for non-Error in catch", async () => {
    mockPost.mockRejectedValueOnce(42);
    await expect(updateGuestUsername("x")).rejects.toBe(42);
    expect(mockToasterCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        description: "An error occurred",
        type: "error",
      }),
    );
  });
});
