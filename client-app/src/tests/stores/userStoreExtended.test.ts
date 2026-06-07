import { describe, it, expect, beforeEach } from "vitest";
import { useUserStore } from "@/shared/stores/userStore";

describe("userStore - isGuestUser", () => {
  beforeEach(() => {
    useUserStore.getState().clearUser();
  });

  it("isGuestUser returns false when user is not a guest", () => {
    const { setUser, isGuestUser } = useUserStore.getState();
    setUser({ id: "u1", isGuest: false });
    expect(isGuestUser()).toBe(false);
  });

  it("isGuestUser returns true when user.isGuest is true", () => {
    const { setUser, isGuestUser } = useUserStore.getState();
    setUser({ id: "guest-1", isGuest: true });
    expect(isGuestUser()).toBe(true);
  });

  it("isGuestUser returns false when user is not set (default state)", () => {
    const { isGuestUser } = useUserStore.getState();
    expect(isGuestUser()).toBe(false);
  });

  it("isSessionExpired returns false when expiresAt is not set", () => {
    const { setUser, isSessionExpired } = useUserStore.getState();
    setUser({ id: "u1" }); // no expiresAt
    expect(isSessionExpired()).toBe(false);
  });

  it("isSessionExpired returns true when expiresAt is in the past", () => {
    const { setUser, isSessionExpired } = useUserStore.getState();
    setUser({ id: "u1", expiresAt: Date.now() - 5000 });
    expect(isSessionExpired()).toBe(true);
  });

  it("isSessionExpired returns false when expiresAt is in the future", () => {
    const { setUser, isSessionExpired } = useUserStore.getState();
    setUser({ id: "u1", expiresAt: Date.now() + 5000 });
    expect(isSessionExpired()).toBe(false);
  });

  it("isAuthenticated returns false when not authenticated", () => {
    const { isAuthenticated } = useUserStore.getState();
    expect(isAuthenticated()).toBe(false);
  });

  it("isAuthenticated clears user and returns false when session is expired", () => {
    const { setUser, isAuthenticated } = useUserStore.getState();
    setUser({ id: "u1", expiresAt: Date.now() - 1000 });
    const result = isAuthenticated();
    expect(result).toBe(false);
    expect(useUserStore.getState().user.id).toBe("");
  });
});
