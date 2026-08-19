import { describe, it, expect, beforeEach } from "vitest";
import { useUserStore } from "@/shared/stores/userStore";

describe("userStore", () => {
  beforeEach(() => {
    useUserStore.getState().clearUser();
  });

  it("should have initial empty state", () => {
    const state = useUserStore.getState();
    expect(state.user.id).toBe("");
    expect(state.user.isAuthenticated).toBe(false);
  });

  it("setUser should merge fields and honour an explicit isAuthenticated", () => {
    const { setUser } = useUserStore.getState();
    setUser({
      id: "u1",
      email: "test@test.com",
      username: "tester",
      isAuthenticated: true,
    });

    const state = useUserStore.getState();
    expect(state.user.id).toBe("u1");
    expect(state.user.email).toBe("test@test.com");
    expect(state.user.isAuthenticated).toBe(true);
  });

  it("setUser should not promote a logged-out store to authenticated", () => {
    const { setUser, clearUser } = useUserStore.getState();
    clearUser();
    // A rename resolving after logout must not log the user back in with an
    // empty id — every subsequent request would 401 with no way back.
    setUser({ username: "renamed" });

    const state = useUserStore.getState();
    expect(state.user.username).toBe("renamed");
    expect(state.user.isAuthenticated).toBe(false);
  });

  it("clearUser should reset to initial state", () => {
    const { setUser, clearUser } = useUserStore.getState();
    setUser({ id: "u1" });
    clearUser();

    const state = useUserStore.getState();
    expect(state.user.id).toBe("");
    expect(state.user.isAuthenticated).toBe(false);
  });

  it("isAuthenticated should return true when user is logged in and not expired", () => {
    const { setUser, isAuthenticated } = useUserStore.getState();
    setUser({ id: "u1", expiresAt: Date.now() + 10000, isAuthenticated: true });

    expect(isAuthenticated()).toBe(true);
  });

  it("isAuthenticated should report false when expired without writing to the store", () => {
    const { setUser, isAuthenticated } = useUserStore.getState();
    setUser({ id: "u1", expiresAt: Date.now() - 10000, isAuthenticated: true });

    expect(isAuthenticated()).toBe(false);
    // The predicate is called from inside JSX, so it must not set() — that is
    // a store write during React's render phase.
    expect(useUserStore.getState().user.id).toBe("u1");
  });

  it("evictExpiredSession clears an expired session", () => {
    const { setUser, evictExpiredSession } = useUserStore.getState();
    setUser({ id: "u1", expiresAt: Date.now() - 10000, isAuthenticated: true });

    evictExpiredSession();

    expect(useUserStore.getState().user.id).toBe("");
    expect(useUserStore.getState().user.isAuthenticated).toBe(false);
  });

  it("evictExpiredSession leaves a live session alone", () => {
    const { setUser, evictExpiredSession } = useUserStore.getState();
    setUser({ id: "u1", expiresAt: Date.now() + 10000, isAuthenticated: true });

    evictExpiredSession();

    expect(useUserStore.getState().user.id).toBe("u1");
  });
});
