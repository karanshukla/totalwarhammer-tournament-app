/**
 * Branch coverage for features/account/api/accountApi.ts:
 * fetchUserStats:
 *   - res.success=true → returns res.data
 *   - res.success=false → returns null
 *   - catch → returns null
 * refreshSession:
 *   - result.valid=true → returns true
 *   - catch → returns false
 * updateUsername:
 *   - success → setUser called, toaster success, returns data
 *   - responseData.success=false → throws error
 *   - catch Error → toaster error with message
 *   - catch non-Error → toaster error with "An error occurred"
 * deleteAccount:
 *   - success → clearUser called, toaster success
 *   - responseData.success=false → throws
 *   - catch
 * updatePassword:
 *   - success → toaster success
 *   - responseData.success=false → throws
 *   - catch
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockGet,
  mockPost,
  mockDelete,
  mockCheckSessionStatus,
  mockGetState,
  mockSetUser,
  mockClearUser,
  mockToasterCreate,
} = vi.hoisted(() => {
  const mockSetUser = vi.fn();
  const mockClearUser = vi.fn();
  return {
    mockGet: vi.fn(),
    mockPost: vi.fn(),
    mockDelete: vi.fn(),
    mockCheckSessionStatus: vi.fn(),
    mockGetState: vi.fn(() => ({
      setUser: mockSetUser,
      clearUser: mockClearUser,
    })),
    mockSetUser,
    mockClearUser,
    mockToasterCreate: vi.fn(),
  };
});

vi.mock("@/core/api/httpClient", () => ({
  httpClient: {
    get: mockGet,
    post: mockPost,
    delete: mockDelete,
    checkSessionStatus: mockCheckSessionStatus,
  },
}));

vi.mock("@/shared/stores/userStore", () => ({
  useUserStore: { getState: mockGetState },
}));

vi.mock("@/shared/ui/toasterStore", () => ({
  toaster: { create: mockToasterCreate },
}));

import {
  fetchUserStats,
  refreshSession,
  updateUsername,
  deleteAccount,
  updatePassword,
} from "@/features/account/api/accountApi";

const fakeStats = {
  tournamentsCreated: 3,
  matchesPlayed: 10,
  wins: 6,
  losses: 4,
  factions: [{ name: "Greenskins", count: 5 }],
};

describe("fetchUserStats", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns data when res.success=true", async () => {
    mockGet.mockResolvedValueOnce({ success: true, data: fakeStats });
    const result = await fetchUserStats();
    expect(result).toEqual(fakeStats);
  });

  it("returns null when res.success=false", async () => {
    mockGet.mockResolvedValueOnce({ success: false, data: null });
    const result = await fetchUserStats();
    expect(result).toBeNull();
  });

  it("returns null when httpClient.get throws", async () => {
    mockGet.mockRejectedValueOnce(new Error("Network error"));
    const result = await fetchUserStats();
    expect(result).toBeNull();
  });
});

describe("refreshSession", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns true when checkSessionStatus is valid", async () => {
    mockCheckSessionStatus.mockResolvedValueOnce({ valid: true });
    const result = await refreshSession();
    expect(result).toBe(true);
  });

  it("returns false when checkSessionStatus throws", async () => {
    mockCheckSessionStatus.mockRejectedValueOnce(new Error("fail"));
    const result = await refreshSession();
    expect(result).toBe(false);
  });
});

describe("updateUsername", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls setUser and toaster on success", async () => {
    mockPost.mockResolvedValueOnce({
      success: true,
      message: "ok",
      data: { id: "u1", username: "NewName", email: "a@b.com" },
    });
    await updateUsername("NewName");
    expect(mockSetUser).toHaveBeenCalledWith({ username: "NewName" });
    expect(mockToasterCreate).toHaveBeenCalledWith(
      expect.objectContaining({ type: "success" }),
    );
  });

  it("throws when responseData.success=false", async () => {
    mockPost.mockResolvedValueOnce({ success: false, message: "Bad name" });
    await expect(updateUsername("x")).rejects.toThrow("Bad name");
    expect(mockToasterCreate).toHaveBeenCalledWith(
      expect.objectContaining({ type: "error" }),
    );
  });

  it("falls back to the passed-in username when responseData.data is absent", async () => {
    mockPost.mockResolvedValueOnce({ success: true, message: "ok" });
    await updateUsername("FallbackName");
    expect(mockSetUser).toHaveBeenCalledWith({ username: "FallbackName" });
  });

  it("throws the default message when responseData.success=false and message is absent", async () => {
    mockPost.mockResolvedValueOnce({ success: false });
    await expect(updateUsername("x")).rejects.toThrow(
      "Failed to update username",
    );
  });

  it("toaster shows Error.message on Error throw from post", async () => {
    mockPost.mockRejectedValueOnce(new Error("Connection refused"));
    await expect(updateUsername("x")).rejects.toThrow();
    expect(mockToasterCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        description: "Connection refused",
        type: "error",
      }),
    );
  });

  it("toaster shows 'An error occurred' on non-Error throw", async () => {
    mockPost.mockRejectedValueOnce("some string error");
    await expect(updateUsername("x")).rejects.toThrow();
    expect(mockToasterCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        description: "An error occurred",
        type: "error",
      }),
    );
  });
});

describe("deleteAccount", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls clearUser and toaster on success", async () => {
    mockDelete.mockResolvedValueOnce({ success: true, message: "deleted" });
    await deleteAccount();
    expect(mockClearUser).toHaveBeenCalled();
    expect(mockToasterCreate).toHaveBeenCalledWith(
      expect.objectContaining({ type: "success" }),
    );
  });

  it("throws when responseData.success=false", async () => {
    mockDelete.mockResolvedValueOnce({
      success: false,
      message: "Cannot delete",
    });
    await expect(deleteAccount()).rejects.toThrow("Cannot delete");
  });

  it("throws the default message when responseData.success=false and message is absent", async () => {
    mockDelete.mockResolvedValueOnce({ success: false });
    await expect(deleteAccount()).rejects.toThrow("Failed to delete account");
  });

  it("toaster shows error on catch", async () => {
    mockDelete.mockRejectedValueOnce(new Error("Network"));
    await expect(deleteAccount()).rejects.toThrow();
    expect(mockToasterCreate).toHaveBeenCalledWith(
      expect.objectContaining({ type: "error" }),
    );
  });

  it("toaster shows 'An error occurred' on non-Error throw", async () => {
    mockDelete.mockRejectedValueOnce("some string error");
    await expect(deleteAccount()).rejects.toBe("some string error");
    expect(mockToasterCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        description: "An error occurred",
        type: "error",
      }),
    );
  });
});

describe("updatePassword", () => {
  beforeEach(() => vi.clearAllMocks());

  const pwData = {
    currentPassword: "old",
    newPassword: "new1234",
    confirmPassword: "new1234",
  };

  it("shows success toaster on success", async () => {
    mockPost.mockResolvedValueOnce({ success: true, message: "ok" });
    await updatePassword(pwData);
    expect(mockToasterCreate).toHaveBeenCalledWith(
      expect.objectContaining({ type: "success" }),
    );
  });

  it("throws when responseData.success=false", async () => {
    mockPost.mockResolvedValueOnce({
      success: false,
      message: "Wrong password",
    });
    await expect(updatePassword(pwData)).rejects.toThrow("Wrong password");
  });

  it("throws the default message when responseData.success=false and message is absent", async () => {
    mockPost.mockResolvedValueOnce({ success: false });
    await expect(updatePassword(pwData)).rejects.toThrow(
      "Failed to update password",
    );
  });

  it("toaster shows Error.message on Error throw", async () => {
    mockPost.mockRejectedValueOnce(new Error("Timeout"));
    await expect(updatePassword(pwData)).rejects.toThrow();
    expect(mockToasterCreate).toHaveBeenCalledWith(
      expect.objectContaining({ description: "Timeout", type: "error" }),
    );
  });

  it("toaster shows 'An error occurred' on non-Error throw", async () => {
    mockPost.mockRejectedValueOnce(42);
    await expect(updatePassword(pwData)).rejects.toThrow();
    expect(mockToasterCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        description: "An error occurred",
        type: "error",
      }),
    );
  });
});
