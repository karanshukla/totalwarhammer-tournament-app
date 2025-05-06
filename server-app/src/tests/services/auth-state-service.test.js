// Tests for auth-state-service.js using Node.js built-in test runner
import assert from "node:assert";
import { describe, it, beforeEach, mock } from "node:test";

import AuthStateService from "../../infrastructure/services/auth-state-service.js";

// Enable mock timers with the proper option
mock.timers.enable({ apis: ["Date"] });

// Helper function for creating mock Express request objects
function createMockRequest({
  session = {},
  ip = "127.0.0.1",
  userAgent = "test-agent",
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
    it("should create a new user authentication state", () => {
      // Arrange
      const req = createMockRequest({ session: { cookie: {} } });
      const userData = {
        _id: "123",
        email: "test@example.com",
        username: "testuser",
        role: "admin",
      };

      // Act
      authStateService.createUserAuthState(req, userData);

      // Assert
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
        ip: "127.0.0.1",
        userAgent: "test-agent",
      });
      assert.strictEqual(
        req.session.cookie.maxAge,
        authStateService.DEFAULT_AUTH_STATE_TIMEOUT
      );
    });

    it("should set extended timeout with rememberMe flag", () => {
      const req = createMockRequest({ session: { cookie: {} } });
      const userData = { _id: "123", username: "testuser", rememberMe: true };

      authStateService.createUserAuthState(req, userData);

      assert.strictEqual(
        req.session.cookie.maxAge,
        authStateService.REMEMBER_ME_TIMEOUT
      );
    });

    it("should throw an error with invalid input", () => {
      assert.throws(
        () => authStateService.createUserAuthState(null, { id: "123" }),
        { message: /Invalid request or user data/ }
      );

      assert.throws(() => authStateService.createUserAuthState({}, null), {
        message: /Invalid request or user data/,
      });
    });
  });

  describe("getCurrentUser", () => {
    it("should return the current user from session", () => {
      const user = { id: "123", username: "testuser" };
      const req = createMockRequest({ session: { user } });

      const result = authStateService.getCurrentUser(req);

      assert.deepStrictEqual(result, user);
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
          fingerprint: { ip: "127.0.0.1", userAgent: "test-agent" },
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

    it("should return false when IP address does not match", () => {
      const req = createMockRequest({
        session: {
          isAuthenticated: true,
          user: { id: "123" },
          fingerprint: { ip: "192.168.1.1", userAgent: "test-agent" },
        },
        ip: "127.0.0.1",
      });

      assert.strictEqual(authStateService.isAuthenticated(req), false);
    });

    it("should return false when user agent does not match", () => {
      const req = createMockRequest({
        session: {
          isAuthenticated: true,
          user: { id: "123" },
          fingerprint: { ip: "127.0.0.1", userAgent: "different-agent" },
        },
      });

      assert.strictEqual(authStateService.isAuthenticated(req), false);
    });
  });

  describe("isAuthenticated - guest user", () => {
    it("should return true for authenticated guest users", () => {
      const req = createMockRequest({
        session: {
          isAuthenticated: true,
          isGuest: true,
          user: { id: "123", isGuest: true },
          fingerprint: { userAgent: "test-agent" },
        },
      });

      assert.strictEqual(authStateService.isAuthenticated(req), true);
    });

    it("should return false for guest without user data", () => {
      const req = createMockRequest({
        session: {
          isAuthenticated: true,
          isGuest: true,
          fingerprint: { userAgent: "test-agent" },
        },
      });

      assert.strictEqual(authStateService.isAuthenticated(req), false);
    });

    it("should return false when guest user agent does not match", () => {
      const req = createMockRequest({
        session: {
          isAuthenticated: true,
          isGuest: true,
          user: { id: "123", isGuest: true },
          fingerprint: { userAgent: "different-agent" },
        },
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

    it("should handle missing session", () => {
      const callbackMock = mock.fn();
      const req = {};

      authStateService.clearAuthState(req, callbackMock);

      assert.strictEqual(callbackMock.mock.calls.length, 1);
    });

    it("should handle missing callback", () => {
      const destroyMock = mock.fn();
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

      authStateService.createGuestAuthState(req, guestId);

      assert.deepStrictEqual(req.session.user, {
        id: "guest123",
        isGuest: true,
        role: "guest",
      });
      assert.strictEqual(req.session.isAuthenticated, true);
      assert.strictEqual(req.session.isGuest, true);
      assert.ok(req.session.createdAt instanceof Date);
      assert.deepStrictEqual(req.session.fingerprint, {
        ip: "127.0.0.1",
        userAgent: "test-agent",
      });
      assert.strictEqual(
        req.session.cookie.maxAge,
        authStateService.GUEST_AUTH_STATE_TIMEOUT
      );
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
        { message: /Invalid request or guest ID/ }
      );

      assert.throws(() => authStateService.createGuestAuthState({}, null), {
        message: /Invalid request or guest ID/,
      });
    });
  });
});
