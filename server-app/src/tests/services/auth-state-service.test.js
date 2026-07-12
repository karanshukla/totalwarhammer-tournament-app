import assert from "node:assert";
import { describe, it, beforeEach, mock } from "node:test";

import AuthStateService from "../../infrastructure/services/auth-state-service.js";

mock.timers.enable(["Date"]);

// Real UA strings so ua-parser-js can identify browser/OS
const CHROME_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const FIREFOX_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0";

function createMockRequest({
  session = {},
  ip = "127.0.0.1",
  userAgent = CHROME_UA,
} = {}) {
  return {
    session,
    ip,
    get: (header) => (header === "user-agent" ? userAgent : null),
  };
}

describe("AuthStateService", () => {
  let authStateService;

  beforeEach(() => {
    authStateService = new AuthStateService();
  });

  describe("createUserAuthState", () => {
    it("should create a new user authentication state", async () => {
      const req = createMockRequest({ session: { cookie: {} } });
      const userData = {
        _id: "123",
        email: "test@example.com",
        username: "testuser",
        role: "admin",
      };

      await authStateService.createUserAuthState(req, userData);

      assert.deepStrictEqual(req.session.user, {
        id: "123",
        email: "test@example.com",
        username: "testuser",
        role: "admin",
        isGuest: false,
      });
      assert.strictEqual(req.session.isAuthenticated, true);
      assert.ok(req.session.createdAt instanceof Date);
      assert.deepStrictEqual(req.session.fingerprint, {
        browser: "Chrome",
        os: "Windows",
      });
      assert.strictEqual(
        req.session.cookie.maxAge,
        authStateService.DEFAULT_AUTH_STATE_TIMEOUT,
      );
    });

    it("should set extended timeout with rememberMe flag", async () => {
      const req = createMockRequest({ session: { cookie: {} } });
      const userData = { _id: "123", username: "testuser", rememberMe: true };

      await authStateService.createUserAuthState(req, userData);

      assert.strictEqual(
        req.session.cookie.maxAge,
        authStateService.REMEMBER_ME_TIMEOUT,
      );
    });

    it("should throw an error with invalid input", async () => {
      await assert.rejects(
        () => authStateService.createUserAuthState(null, { id: "123" }),
        { message: /Invalid request or user data/ },
      );

      await assert.rejects(
        () => authStateService.createUserAuthState({}, null),
        { message: /Invalid request or user data/ },
      );
    });

    it("calls req.login when passport is present on the request", async () => {
      const loginMock = mock.fn((user, cb) => cb(null));
      const req = createMockRequest({ session: { cookie: {} } });
      req.login = loginMock;

      await authStateService.createUserAuthState(req, {
        _id: "123",
        username: "testuser",
      });

      assert.strictEqual(loginMock.mock.calls.length, 1);
    });
  });

  describe("getCurrentUser", () => {
    it("should return the current user from session", () => {
      const user = { id: "123", username: "testuser" };
      const req = createMockRequest({ session: { user } });

      const result = authStateService.getCurrentUser(req);

      assert.deepStrictEqual(result, user);
    });

    it("prefers req.user (passport) over session.user", () => {
      const passportUser = { id: "abc", username: "passport" };
      const sessionUser = { id: "xyz", username: "session" };
      const req = createMockRequest({ session: { user: sessionUser } });
      req.user = passportUser;

      assert.deepStrictEqual(
        authStateService.getCurrentUser(req),
        passportUser,
      );
    });

    it("should return null when no user in session", () => {
      const req = createMockRequest({ session: {} });
      assert.strictEqual(authStateService.getCurrentUser(req), null);
    });

    it("should return null when no session", () => {
      const req = createMockRequest({ session: undefined });
      assert.strictEqual(authStateService.getCurrentUser(req), null);
    });
  });

  describe("isAuthenticated", () => {
    it("should return true for authenticated users", () => {
      const req = createMockRequest({
        session: {
          isAuthenticated: true,
          user: { id: "123" },
          fingerprint: { browser: "Chrome", os: "Windows" },
        },
      });

      assert.strictEqual(authStateService.isAuthenticated(req), true);
    });

    it("should return false when session is missing", () => {
      const req = createMockRequest({ session: undefined });
      assert.strictEqual(authStateService.isAuthenticated(req), false);
    });

    it("should return false when isAuthenticated flag is missing", () => {
      const req = createMockRequest({ session: {} });
      assert.strictEqual(authStateService.isAuthenticated(req), false);
    });

    it("should return true when IP address changes (IP is not checked)", () => {
      const req = createMockRequest({
        session: {
          isAuthenticated: true,
          user: { id: "123" },
          fingerprint: { browser: "Chrome", os: "Windows" },
        },
        ip: "10.0.0.99",
      });

      assert.strictEqual(authStateService.isAuthenticated(req), true);
    });

    it("should return false when browser family changes", () => {
      // Session fingerprinted with Chrome, but Firefox is making the request
      const req = createMockRequest({
        session: {
          isAuthenticated: true,
          user: { id: "123" },
          fingerprint: { browser: "Chrome", os: "Windows" },
        },
        userAgent: FIREFOX_UA,
      });

      assert.strictEqual(authStateService.isAuthenticated(req), false);
    });

    it("should return true when UA version changes but browser family is the same", () => {
      const CHROME_NEWER =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";
      const req = createMockRequest({
        session: {
          isAuthenticated: true,
          user: { id: "123" },
          fingerprint: { browser: "Chrome", os: "Windows" },
        },
        userAgent: CHROME_NEWER,
      });

      assert.strictEqual(authStateService.isAuthenticated(req), true);
    });
  });

  describe("isAuthenticated - guest user", () => {
    it("should return true for authenticated guest users", () => {
      const req = createMockRequest({
        session: {
          isAuthenticated: true,
          isGuest: true,
          user: { id: "123", isGuest: true },
          fingerprint: { browser: "Chrome", os: "Windows" },
        },
      });

      assert.strictEqual(authStateService.isAuthenticated(req), true);
    });

    it("should return false for guest without user data", () => {
      const req = createMockRequest({
        session: {
          isAuthenticated: true,
          isGuest: true,
          fingerprint: { browser: "Chrome", os: "Windows" },
        },
      });

      assert.strictEqual(authStateService.isAuthenticated(req), false);
    });

    it("should return false when guest browser family changes", () => {
      const req = createMockRequest({
        session: {
          isAuthenticated: true,
          isGuest: true,
          user: { id: "123", isGuest: true },
          fingerprint: { browser: "Chrome", os: "Windows" },
        },
        userAgent: FIREFOX_UA,
      });

      assert.strictEqual(authStateService.isAuthenticated(req), false);
    });
  });

  describe("clearAuthState", () => {
    it("should destroy the session and call the callback", () => {
      const destroyMock = mock.fn((callback) => callback());
      const callbackMock = mock.fn();
      const req = { session: { destroy: destroyMock } };

      authStateService.clearAuthState(req, callbackMock);

      assert.strictEqual(destroyMock.mock.calls.length, 1);
      assert.strictEqual(callbackMock.mock.calls.length, 1);
    });

    it("uses req.logout when passport is present", () => {
      const logoutMock = mock.fn((cb) => cb());
      const callbackMock = mock.fn();
      const req = { logout: logoutMock };

      authStateService.clearAuthState(req, callbackMock);

      assert.strictEqual(logoutMock.mock.calls.length, 1);
      assert.strictEqual(callbackMock.mock.calls.length, 1);
    });

    it("should handle missing session", () => {
      const callbackMock = mock.fn();
      const req = {};

      authStateService.clearAuthState(req, callbackMock);

      assert.strictEqual(callbackMock.mock.calls.length, 1);
    });

    it("should handle missing callback", () => {
      const destroyMock = mock.fn((cb) => cb());
      const req = { session: { destroy: destroyMock } };

      authStateService.clearAuthState(req);

      assert.strictEqual(destroyMock.mock.calls.length, 1);
    });
  });

  describe("createGuestAuthState", () => {
    it("should create a new guest authentication state", () => {
      const saveMock = mock.fn((callback) => callback());
      const req = createMockRequest({
        session: {
          save: saveMock,
          cookie: {},
        },
      });
      const guestId = "guest123";
      const guestUsername = "Guest_guest1";

      authStateService.createGuestAuthState(req, guestId, guestUsername);

      assert.deepStrictEqual(req.session.user, {
        id: "guest123",
        username: "Guest_guest1",
        isGuest: true,
        role: "guest",
      });
      assert.strictEqual(req.session.isAuthenticated, true);
      assert.strictEqual(req.session.isGuest, true);
      assert.ok(req.session.createdAt instanceof Date);
      assert.deepStrictEqual(req.session.fingerprint, {
        browser: "Chrome",
        os: "Windows",
      });
      assert.strictEqual(
        req.session.cookie.maxAge,
        authStateService.GUEST_AUTH_STATE_TIMEOUT,
      );
      assert.strictEqual(saveMock.mock.calls.length, 1);
    });

    it("should log an error when session.save fails", () => {
      const saveMock = mock.fn((callback) => callback(new Error("disk full")));
      const req = createMockRequest({
        session: {
          save: saveMock,
          cookie: {},
        },
      });

      // Should not throw — the save error is only logged
      authStateService.createGuestAuthState(req, "guest123");
      assert.strictEqual(saveMock.mock.calls.length, 1);
    });

    it("should handle missing save method", () => {
      const req = createMockRequest({
        session: { cookie: {} },
      });

      // Should not throw
      authStateService.createGuestAuthState(req, "guest123");
    });

    it("should throw an error with invalid input", () => {
      assert.throws(
        () => authStateService.createGuestAuthState(null, "guest123"),
        { message: /Invalid request or guest ID/ },
      );

      assert.throws(() => authStateService.createGuestAuthState({}, null), {
        message: /Invalid request or guest ID/,
      });
    });
  });
});
