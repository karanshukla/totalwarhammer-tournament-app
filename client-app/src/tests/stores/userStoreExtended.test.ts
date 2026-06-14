/**
 * Extended coverage for userStore.
 * Covers: isSessionExpired with future expiresAt (returns false), line 68.
 * Also covers: isAuthenticated with expired session (clears user), isGuestUser.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { useUserStore } from "@/shared/stores/userStore";

describe("userStore – isSessionExpired", () => {
  beforeEach(() => {
    useUserStore.getState().clearUser();
  });

  it("returns false when expiresAt is in the future", () => {
    useUserStore.getState().setUser({
      id: "u1",
      email: "test@test.com",
      expiresAt: Date.now() + 60_000, // 1 minute from now
    });
    expect(useUserStore.getState().isSessionExpired()).toBe(false);
  });

  it("returns true when expiresAt is in the past", () => {
    useUserStore.setState((state) => ({
      user: {
        ...state.user,
        isAuthenticated: true,
        expiresAt: Date.now() - 1000, // 1 second ago
      },
    }));
    expect(useUserStore.getState().isSessionExpired()).toBe(true);
  });

  it("returns false when expiresAt is undefined", () => {
    useUserStore.getState().setUser({ id: "u2", email: "x@x.com" });
    useUserStore.setState((state) => ({
      user: { ...state.user, expiresAt: undefined },
    }));
    expect(useUserStore.getState().isSessionExpired()).toBe(false);
  });
});

describe("userStore – isAuthenticated with expiry", () => {
  beforeEach(() => {
    useUserStore.getState().clearUser();
  });

  it("returns false and clears user when session is expired", () => {
    useUserStore.setState((state) => ({
      user: {
        ...state.user,
        isAuthenticated: true,
        expiresAt: Date.now() - 5000,
      },
    }));
    const result = useUserStore.getState().isAuthenticated();
    expect(result).toBe(false);
    // clearUser should have been called
    expect(useUserStore.getState().user.isAuthenticated).toBe(false);
  });

  it("returns true when authenticated and not expired", () => {
    useUserStore.getState().setUser({
      id: "u3",
      email: "valid@test.com",
      expiresAt: Date.now() + 60_000,
    });
    expect(useUserStore.getState().isAuthenticated()).toBe(true);
  });

  it("returns false immediately when user.isAuthenticated is false", () => {
    useUserStore.getState().clearUser();
    expect(useUserStore.getState().isAuthenticated()).toBe(false);
  });
});

describe("userStore – isGuestUser", () => {
  beforeEach(() => {
    useUserStore.getState().clearUser();
  });

  it("returns true when user is a guest", () => {
    useUserStore.setState((state) => ({
      user: { ...state.user, isGuest: true, isAuthenticated: true },
    }));
    expect(useUserStore.getState().isGuestUser()).toBe(true);
  });

  it("returns false when user is not a guest", () => {
    useUserStore.getState().setUser({ id: "u1", email: "reg@test.com" });
    expect(useUserStore.getState().isGuestUser()).toBe(false);
  });
});

describe("userStore – setUser and clearUser", () => {
  beforeEach(() => {
    useUserStore.getState().clearUser();
  });

  it("setUser merges partial user data", () => {
    useUserStore
      .getState()
      .setUser({ id: "u5", email: "a@b.com", username: "alpha" });
    const state = useUserStore.getState();
    expect(state.user.id).toBe("u5");
    expect(state.user.username).toBe("alpha");
    expect(state.user.isAuthenticated).toBe(true);
  });

  it("clearUser resets to initial state", () => {
    useUserStore.getState().setUser({ id: "u1", email: "x@y.com" });
    useUserStore.getState().clearUser();
    const state = useUserStore.getState();
    expect(state.user.isAuthenticated).toBe(false);
    expect(state.user.id).toBe("");
  });
});
