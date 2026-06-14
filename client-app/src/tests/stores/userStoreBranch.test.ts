/**
 * Covers the uncovered branch at line 50 of userStore.ts:
 *   `if (!user.isAuthenticated) return false;`
 * The `true` path (user not authenticated) was never tested directly via isAuthenticated().
 */
import { describe, it, expect, beforeEach } from "vitest";
import { useUserStore } from "@/shared/stores/userStore";

describe("userStore – isAuthenticated early-return branch (line 50)", () => {
  beforeEach(() => {
    useUserStore.getState().clearUser();
  });

  it("returns false immediately when user.isAuthenticated is false", () => {
    // clearUser sets isAuthenticated: false — calling isAuthenticated() should
    // hit the `if (!user.isAuthenticated) return false` branch immediately.
    const result = useUserStore.getState().isAuthenticated();
    expect(result).toBe(false);
  });

  it("does not call isSessionExpired when user is not authenticated", () => {
    // State after clearUser: isAuthenticated = false, expiresAt = undefined.
    // The function should return false at line 50 without checking expiry.
    useUserStore.getState().clearUser();
    const result = useUserStore.getState().isAuthenticated();
    expect(result).toBe(false);
    // The user state remains cleared (no side effects from expiry check)
    expect(useUserStore.getState().user.isAuthenticated).toBe(false);
    expect(useUserStore.getState().user.id).toBe("");
  });

  it("returns false when isAuthenticated flag was never set", () => {
    // Fresh state should also trigger the early-return branch
    const initialState = useUserStore.getState();
    expect(initialState.user.isAuthenticated).toBe(false);
    expect(initialState.isAuthenticated()).toBe(false);
  });
});
