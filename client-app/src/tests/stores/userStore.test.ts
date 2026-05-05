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

  it("setUser should update user and set isAuthenticated to true", () => {
    const { setUser } = useUserStore.getState();
    setUser({ id: "u1", email: "test@test.com", username: "tester" });

    const state = useUserStore.getState();
    expect(state.user.id).toBe("u1");
    expect(state.user.email).toBe("test@test.com");
    expect(state.user.isAuthenticated).toBe(true);
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
    setUser({ id: "u1", expiresAt: Date.now() + 10000 });

    expect(isAuthenticated()).toBe(true);
  });

  it("isAuthenticated should return false and clear user when expired", () => {
    const { setUser, isAuthenticated } = useUserStore.getState();
    // Set to 10 seconds ago
    setUser({ id: "u1", expiresAt: Date.now() - 10000 });

    expect(isAuthenticated()).toBe(false);
    expect(useUserStore.getState().user.id).toBe("");
  });
});
