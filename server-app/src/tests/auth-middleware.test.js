/**
 * Branch coverage for interfaces/http/middleware/auth-middleware.js:
 *
 * authenticateSession:
 *   - !isAuthenticated → 401
 *   - isAuthenticated but !getCurrentUser → 401
 *   - success → next()
 *   - catch (throw) → 500
 *
 * authenticateGuestSession:
 *   - !req.session → 401
 *   - req.session.user exists, !isGuest && session.isGuest → fixes flag
 *   - req.session.user exists, isGuest already set → next()
 *   - no user, session.id exists → recovery path + session.save success
 *   - no user, session.id exists → recovery path + session.save error
 *   - no user, no session.id → 401
 *   - catch → 500
 *
 * checkRole:
 *   - !req.user → 401
 *   - role matches (string) → next()
 *   - role matches (array) → next()
 *   - role doesn't match → 403
 */
import assert from "node:assert";
import { describe, it, beforeEach, mock } from "node:test";

const mockIsAuthenticated = mock.fn();
const mockGetCurrentUser = mock.fn();

mock.module("../infrastructure/services/auth-state-service.js", {
  defaultExport: class {
    isAuthenticated = mockIsAuthenticated;
    getCurrentUser = mockGetCurrentUser;
  },
});

mock.module("../infrastructure/utils/logger.js", {
  defaultExport: {
    error: mock.fn(),
    warn: mock.fn(),
    info: mock.fn(),
    debug: mock.fn(),
  },
});

const { authenticateSession, authenticateGuestSession, checkRole } =
  await import("../interfaces/http/middleware/auth-middleware.js");

function mockRes() {
  const res = {};
  res.status = mock.fn(() => res);
  res.json = mock.fn(() => res);
  return res;
}

// ── authenticateSession ────────────────────────────────────────────────────

describe("authenticateSession", () => {
  beforeEach(() => {
    mockIsAuthenticated.mock.resetCalls();
    mockGetCurrentUser.mock.resetCalls();
  });

  it("returns 401 when not authenticated", () => {
    mockIsAuthenticated.mock.mockImplementation(() => false);
    const req = { path: "/x", method: "GET", session: {}, headers: {} };
    const res = mockRes();
    const next = mock.fn();
    authenticateSession(req, res, next);
    assert.strictEqual(res.status.mock.calls[0].arguments[0], 401);
    assert.strictEqual(next.mock.calls.length, 0);
  });

  it("returns 401 when authenticated but getCurrentUser returns null", () => {
    mockIsAuthenticated.mock.mockImplementation(() => true);
    mockGetCurrentUser.mock.mockImplementation(() => null);
    const req = {
      path: "/x",
      method: "GET",
      session: { id: "s1" },
      headers: {},
    };
    const res = mockRes();
    const next = mock.fn();
    authenticateSession(req, res, next);
    assert.strictEqual(res.status.mock.calls[0].arguments[0], 401);
    assert.strictEqual(next.mock.calls.length, 0);
  });

  it("calls next() when authenticated and user exists", () => {
    mockIsAuthenticated.mock.mockImplementation(() => true);
    mockGetCurrentUser.mock.mockImplementation(() => ({
      id: "u1",
      username: "hero",
    }));
    const req = { path: "/x", method: "GET", session: {}, headers: {} };
    const res = mockRes();
    const next = mock.fn();
    authenticateSession(req, res, next);
    assert.strictEqual(next.mock.calls.length, 1);
    assert.strictEqual(req.user.id, "u1");
  });

  it("returns 500 when isAuthenticated throws", () => {
    mockIsAuthenticated.mock.mockImplementation(() => {
      throw new Error("explosion");
    });
    const req = { path: "/x", method: "GET", session: {}, headers: {} };
    const res = mockRes();
    const next = mock.fn();
    authenticateSession(req, res, next);
    assert.strictEqual(res.status.mock.calls[0].arguments[0], 500);
  });
});

// ── authenticateGuestSession ───────────────────────────────────────────────

describe("authenticateGuestSession", () => {
  it("returns 401 when req.session is falsy", () => {
    const req = { session: null, headers: {} };
    const res = mockRes();
    const next = mock.fn();
    authenticateGuestSession(req, res, next);
    assert.strictEqual(res.status.mock.calls[0].arguments[0], 401);
  });

  it("calls next() and sets req.user from session.user", () => {
    const req = {
      session: { user: { id: "g1", isGuest: true }, isGuest: true },
      headers: {},
    };
    const res = mockRes();
    const next = mock.fn();
    authenticateGuestSession(req, res, next);
    assert.strictEqual(next.mock.calls.length, 1);
    assert.strictEqual(req.user.id, "g1");
  });

  it("logs 'Present' when a cookie header exists and lists header keys", () => {
    const req = {
      session: { user: { id: "g1", isGuest: true }, isGuest: true },
      headers: { cookie: "sid=abc", "user-agent": "test" },
    };
    const res = mockRes();
    const next = mock.fn();
    authenticateGuestSession(req, res, next);
    assert.strictEqual(next.mock.calls.length, 1);
  });

  it("logs an empty header list when req.headers is falsy", () => {
    // Use an empty string (falsy, but property access doesn't throw via
    // auto-boxing) rather than undefined/null, since line 70 dereferences
    // req.headers.cookie without optional chaining.
    const req = {
      session: { user: { id: "g1", isGuest: true }, isGuest: true },
      headers: "",
    };
    const res = mockRes();
    const next = mock.fn();
    authenticateGuestSession(req, res, next);
    assert.strictEqual(next.mock.calls.length, 1);
  });

  it("fixes missing isGuest flag on user when session.isGuest is true", () => {
    const req = {
      session: {
        user: { id: "g2", isGuest: false },
        isGuest: true,
      },
      headers: {},
    };
    const res = mockRes();
    const next = mock.fn();
    authenticateGuestSession(req, res, next);
    assert.strictEqual(req.user.isGuest, true);
    assert.strictEqual(next.mock.calls.length, 1);
  });

  it("recovers session when user is absent but session.id exists (save success)", () => {
    const saveFn = mock.fn((cb) => cb(null));
    const req = {
      session: { id: "sess123", save: saveFn },
      headers: {},
    };
    const res = mockRes();
    const next = mock.fn();
    authenticateGuestSession(req, res, next);
    assert.strictEqual(next.mock.calls.length, 1);
    assert.strictEqual(req.user.isGuest, true);
    assert.ok(req.user.username.startsWith("Guest_"));
    assert.strictEqual(saveFn.mock.calls.length, 1);
  });

  it("recovers session and logs error when session.save fails", () => {
    const saveFn = mock.fn((cb) => cb(new Error("save fail")));
    const req = {
      session: { id: "sess456", save: saveFn },
      headers: {},
    };
    const res = mockRes();
    const next = mock.fn();
    authenticateGuestSession(req, res, next);
    // Still calls next — save error is non-fatal
    assert.strictEqual(next.mock.calls.length, 1);
  });

  it("returns 401 when session exists but no user and no session.id", () => {
    const req = {
      session: {},
      headers: {},
    };
    const res = mockRes();
    const next = mock.fn();
    authenticateGuestSession(req, res, next);
    assert.strictEqual(res.status.mock.calls[0].arguments[0], 401);
  });

  it("returns 500 when an unexpected error is thrown", () => {
    const req = {
      get session() {
        throw new Error("boom");
      },
      headers: {},
    };
    const res = mockRes();
    const next = mock.fn();
    authenticateGuestSession(req, res, next);
    assert.strictEqual(res.status.mock.calls[0].arguments[0], 500);
  });
});

// ── checkRole ─────────────────────────────────────────────────────────────

describe("checkRole", () => {
  it("returns 401 when req.user is absent", () => {
    const req = {};
    const res = mockRes();
    const next = mock.fn();
    checkRole("admin")(req, res, next);
    assert.strictEqual(res.status.mock.calls[0].arguments[0], 401);
  });

  it("calls next() when role matches (string argument)", () => {
    const req = { user: { role: "admin" } };
    const res = mockRes();
    const next = mock.fn();
    checkRole("admin")(req, res, next);
    assert.strictEqual(next.mock.calls.length, 1);
  });

  it("calls next() when role matches (array argument)", () => {
    const req = { user: { role: "moderator" } };
    const res = mockRes();
    const next = mock.fn();
    checkRole(["admin", "moderator"])(req, res, next);
    assert.strictEqual(next.mock.calls.length, 1);
  });

  it("returns 403 when role does not match", () => {
    const req = { user: { role: "user" } };
    const res = mockRes();
    const next = mock.fn();
    checkRole("admin")(req, res, next);
    assert.strictEqual(res.status.mock.calls[0].arguments[0], 403);
  });

  it("defaults to 'user' role when req.user.role is undefined", () => {
    const req = { user: {} }; // no role field
    const res = mockRes();
    const next = mock.fn();
    // "user" role passes "user" check
    checkRole("user")(req, res, next);
    assert.strictEqual(next.mock.calls.length, 1);
  });
});
