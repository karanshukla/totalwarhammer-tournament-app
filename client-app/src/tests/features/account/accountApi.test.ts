/**
 * Branch coverage for src/features/account/api/accountApi.ts.
 *
 * Covers:
 * - fetchUserStats: res.success=false → null (false branch of ternary)
 * - fetchUserStats: catch → null
 * - updateUsername: responseData.data?.username absent → falls back to `username` param
 * - updateUsername: non-Error in catch → "An error occurred"
 * - deleteAccount: success path (clearUser + toaster)
 * - deleteAccount: responseData.success=false → throws Error
 * - deleteAccount: non-Error in catch → "An error occurred"
 * - updatePassword: success path (toaster)
 * - updatePassword: responseData.success=false → throws Error
 * - updatePassword: non-Error in catch → "An error occurred"
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/core/api/httpClient", () => ({
  httpClient: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/shared/ui/Toaster", () => ({
  toaster: { create: vi.fn() },
}));

vi.mock("@/shared/stores/userStore", () => ({
  useUserStore: {
    getState: vi.fn(() => ({
      setUser: vi.fn(),
      clearUser: vi.fn(),
    })),
  },
}));

import { httpClient } from "@/core/api/httpClient";
import { toaster } from "@/shared/ui/Toaster";
import { useUserStore } from "@/shared/stores/userStore";
import {
  fetchUserStats,
  updateUsername,
  deleteAccount,
  updatePassword,
} from "@/features/account/api/accountApi";

const mockGet = vi.mocked(httpClient.get);
const mockPost = vi.mocked(httpClient.post);
const mockDelete = vi.mocked(httpClient.delete);
const mockToasterCreate = vi.mocked(toaster.create);
const mockGetState = vi.mocked(useUserStore.getState);

describe("accountApi – fetchUserStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetState.mockReturnValue({ setUser: vi.fn(), clearUser: vi.fn() } as ReturnType<typeof useUserStore.getState>);
  });

  it("returns res.data when res.success is true", async () => {
    const statsData = { tournamentsCreated: 3, matchesPlayed: 10, wins: 5, losses: 5, factions: [] };
    mockGet.mockResolvedValueOnce({ success: true, data: statsData });
    const result = await fetchUserStats();
    expect(result).toEqual(statsData);
  });

  it("returns null when res.success is false (false branch of ternary)", async () => {
    mockGet.mockResolvedValueOnce({ success: false, data: null });
    const result = await fetchUserStats();
    expect(result).toBeNull();
  });

  it("returns null on error (catch branch)", async () => {
    mockGet.mockRejectedValueOnce(new Error("Network error"));
    const result = await fetchUserStats();
    expect(result).toBeNull();
  });
});

describe("accountApi – updateUsername", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const mockSetUser = vi.fn();
    mockGetState.mockReturnValue({ setUser: mockSetUser, clearUser: vi.fn() } as ReturnType<typeof useUserStore.getState>);
  });

  it("uses responseData.data.username when present", async () => {
    const mockSetUser = vi.fn();
    mockGetState.mockReturnValue({ setUser: mockSetUser, clearUser: vi.fn() } as ReturnType<typeof useUserStore.getState>);
    mockPost.mockResolvedValueOnce({
      success: true,
      message: "ok",
      data: { id: "u1", username: "NewName", email: "x@x.com" },
    });

    await updateUsername("FallbackName");

    expect(mockSetUser).toHaveBeenCalledWith({ username: "NewName" });
  });

  it("falls back to username param when responseData.data is absent", async () => {
    const mockSetUser = vi.fn();
    mockGetState.mockReturnValue({ setUser: mockSetUser, clearUser: vi.fn() } as ReturnType<typeof useUserStore.getState>);
    mockPost.mockResolvedValueOnce({
      success: true,
      message: "ok",
      // no data property → responseData.data?.username is undefined → || username
    });

    await updateUsername("FallbackName");

    expect(mockSetUser).toHaveBeenCalledWith({ username: "FallbackName" });
  });

  it("throws and shows error toaster on failure (success=false)", async () => {
    mockPost.mockResolvedValueOnce({ success: false, message: "Username taken" });

    await expect(updateUsername("TakenName")).rejects.toThrow("Username taken");
    expect(mockToasterCreate).toHaveBeenCalledWith(
      expect.objectContaining({ type: "error" }),
    );
  });

  it("shows generic error message when non-Error is thrown (catch non-Error branch)", async () => {
    mockPost.mockRejectedValueOnce("string-error");

    await expect(updateUsername("AnyName")).rejects.toBe("string-error");
    expect(mockToasterCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        description: "An error occurred",
        type: "error",
      }),
    );
  });
});

describe("accountApi – deleteAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetState.mockReturnValue({ setUser: vi.fn(), clearUser: vi.fn() } as ReturnType<typeof useUserStore.getState>);
  });

  it("calls clearUser and shows success toaster on success", async () => {
    const mockClearUser = vi.fn();
    mockGetState.mockReturnValue({ setUser: vi.fn(), clearUser: mockClearUser } as ReturnType<typeof useUserStore.getState>);
    mockDelete.mockResolvedValueOnce({ success: true, message: "deleted" });

    await deleteAccount();

    expect(mockClearUser).toHaveBeenCalled();
    expect(mockToasterCreate).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Account Deleted", type: "success" }),
    );
  });

  it("throws when responseData.success is false", async () => {
    mockDelete.mockResolvedValueOnce({ success: false, message: "Cannot delete" });

    await expect(deleteAccount()).rejects.toThrow("Cannot delete");
  });

  it("shows generic error when non-Error is thrown (catch non-Error branch)", async () => {
    mockDelete.mockRejectedValueOnce("raw-error");

    await expect(deleteAccount()).rejects.toBe("raw-error");
    expect(mockToasterCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        description: "An error occurred",
        type: "error",
      }),
    );
  });
});

describe("accountApi – updatePassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetState.mockReturnValue({ setUser: vi.fn(), clearUser: vi.fn() } as ReturnType<typeof useUserStore.getState>);
  });

  const passwordData = {
    currentPassword: "old123",
    newPassword: "new123",
    confirmPassword: "new123",
  };

  it("shows success toaster when password update succeeds", async () => {
    mockPost.mockResolvedValueOnce({ success: true, message: "ok" });

    await updatePassword(passwordData);

    expect(mockToasterCreate).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Password Updated", type: "success" }),
    );
  });

  it("throws when responseData.success is false", async () => {
    mockPost.mockResolvedValueOnce({ success: false, message: "Wrong password" });

    await expect(updatePassword(passwordData)).rejects.toThrow("Wrong password");
  });

  it("shows generic error when non-Error is thrown (catch non-Error branch)", async () => {
    mockPost.mockRejectedValueOnce(42);

    await expect(updatePassword(passwordData)).rejects.toBe(42);
    expect(mockToasterCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        description: "An error occurred",
        type: "error",
      }),
    );
  });
});
