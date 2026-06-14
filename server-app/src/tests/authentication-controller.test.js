import crypto from "crypto";
import assert from "node:assert";
import { describe, it, beforeEach, mock } from "node:test";

const mockUserFindOne = mock.fn();
const mockUserFindById = mock.fn();
const mockValidatePassword = mock.fn();

mock.module("../domain/models/user.js", {
  defaultExport: {
    findOne: mockUserFindOne,
    findById: mockUserFindById,
  },
});

const mockCreateUserAuthState = mock.fn();
const mockClearAuthState = mock.fn();
const mockCreateGuestAuthState = mock.fn();

mock.module("../infrastructure/services/auth-state-service.js", {
  defaultExport: class {
    createUserAuthState = mockCreateUserAuthState;
    clearAuthState = mockClearAuthState;
    createGuestAuthState = mockCreateGuestAuthState;
  },
});

mock.module("../infrastructure/utils/logger.js", {
  defaultExport: {
    error: mock.fn(),
    info: mock.fn(),
    debug: mock.fn(),
    warn: mock.fn(),
  },
});

const { login, logout, token } =
  await import("../interfaces/http/controllers/authentication-controller.js");

function mockRes() {
  const res = {};
  res.status = mock.fn(() => res);
  res.json = mock.fn(() => res);
  res.clearCookie = mock.fn(() => res);
  return res;
}

function mockReq(overrides = {}) {
  return {
    body: {},
    session: {
      cookie: { maxAge: 1000 },
      destroy: mock.fn((cb) => cb()),
    },
    ...overrides,
  };
}

// Helper to build a PKCE code_challenge from a code_verifier (S256)
function buildCodeChallenge(verifier) {
  return crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

describe("authentication-controller", () => {
  beforeEach(() => {
    mockUserFindOne.mock.resetCalls();
    mockUserFindById.mock.resetCalls();
    mockValidatePassword.mock.resetCalls();
    mockCreateUserAuthState.mock.resetCalls();
    mockClearAuthState.mock.resetCalls();
    // Reset createUserAuthState to a no-op so throwing tests don't bleed over
    mockCreateUserAuthState.mock.mockImplementation(async () => {});
    // Reset clearAuthState to default (callback-based, no error)
    mockClearAuthState.mock.mockImplementation((_req, cb) => cb());
  });

  describe("login", () => {
    it("should return 400 if email or password missing", async () => {
      const req = mockReq({ body: { identifier: "test@test.com" } });
      const res = mockRes();
      await login(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it("should return 400 if identifier is empty string", async () => {
      const req = mockReq({ body: { identifier: "  ", password: "pw" } });
      const res = mockRes();
      await login(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it("should return 401 if user not found", async () => {
      mockUserFindOne.mock.mockImplementation(() => ({
        select: mock.fn(() => null),
      }));
      const req = mockReq({
        body: { identifier: "test@test.com", password: "pw" },
      });
      const res = mockRes();
      await login(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 401);
    });

    it("should try exact-match email lookup when lowercase lookup returns null", async () => {
      let callCount = 0;
      mockUserFindOne.mock.mockImplementation(() => ({
        select: mock.fn(() => {
          callCount++;
          return null; // both lookups miss → 401
        }),
      }));
      const req = mockReq({
        body: { identifier: "Test@Test.com", password: "pw" },
      });
      const res = mockRes();
      await login(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 401);
      assert.strictEqual(callCount, 2); // both email lookups attempted
    });

    it("should find user by username (non-email identifier)", async () => {
      const user = {
        id: "u1",
        email: "test@test.com",
        username: "tester",
        validatePassword: mock.fn(async () => false),
      };
      mockUserFindOne.mock.mockImplementation(() => ({
        select: mock.fn(() => user),
      }));
      const req = mockReq({
        body: { identifier: "tester", password: "wrong" },
      });
      const res = mockRes();
      await login(req, res);
      // One findOne call (username lookup, no @)
      assert.strictEqual(mockUserFindOne.mock.calls.length, 1);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 401);
    });

    it("should return 401 if password invalid", async () => {
      const user = {
        validatePassword: mock.fn(async () => false),
      };
      mockUserFindOne.mock.mockImplementation(() => ({
        select: mock.fn(() => user),
      }));
      const req = mockReq({
        body: { identifier: "test@test.com", password: "pw" },
      });
      const res = mockRes();
      await login(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 401);
    });

    it("should login successfully and return 200", async () => {
      const user = {
        id: "u1",
        email: "test@test.com",
        username: "tester",
        validatePassword: mock.fn(async () => true),
        toObject: mock.fn(() => ({ id: "u1", email: "test@test.com" })),
      };
      mockUserFindOne.mock.mockImplementation(() => ({
        select: mock.fn(() => user),
      }));
      const req = mockReq({
        body: { identifier: "test@test.com", password: "pw" },
      });
      const res = mockRes();
      await login(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(mockCreateUserAuthState.mock.calls.length, 1);
    });

    it("should return expiresAt from cookie.expires when present", async () => {
      const expires = new Date(Date.now() + 3600000);
      const user = {
        id: "u1",
        email: "test@test.com",
        username: "tester",
        validatePassword: mock.fn(async () => true),
        toObject: mock.fn(() => ({})),
      };
      mockUserFindOne.mock.mockImplementation(() => ({
        select: mock.fn(() => user),
      }));
      const req = mockReq({
        body: { identifier: "test@test.com", password: "pw" },
        session: { cookie: { expires, maxAge: 3600000 } },
      });
      const res = mockRes();
      await login(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      const data = res.json.mock.calls[0].arguments[0].data;
      assert.strictEqual(data.expiresAt, expires.getTime());
    });

    it("should return 500 when session creation throws", async () => {
      const user = {
        id: "u1",
        email: "test@test.com",
        username: "tester",
        validatePassword: mock.fn(async () => true),
        toObject: mock.fn(() => ({})),
      };
      mockUserFindOne.mock.mockImplementation(() => ({
        select: mock.fn(() => user),
      }));
      mockCreateUserAuthState.mock.mockImplementation(async () => {
        throw new Error("session store error");
      });
      const req = mockReq({
        body: { identifier: "test@test.com", password: "pw" },
      });
      const res = mockRes();
      await login(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 500);
    });

    it("should return 400 when codeChallenge provided without S256 method", async () => {
      const user = {
        id: "u1",
        email: "test@test.com",
        username: "tester",
        validatePassword: mock.fn(async () => true),
        toObject: mock.fn(() => ({})),
      };
      mockUserFindOne.mock.mockImplementation(() => ({
        select: mock.fn(() => user),
      }));
      const req = mockReq({
        body: {
          identifier: "test@test.com",
          password: "pw",
          codeChallenge: "abc",
          codeChallengeMethod: "plain",
        },
      });
      const res = mockRes();
      await login(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it("should return authorization code when PKCE codeChallenge is provided", async () => {
      const verifier = "test-verifier-string-12345";
      const challenge = buildCodeChallenge(verifier);
      const user = {
        id: "u1",
        email: "test@test.com",
        username: "tester",
        validatePassword: mock.fn(async () => true),
        toObject: mock.fn(() => ({})),
      };
      mockUserFindOne.mock.mockImplementation(() => ({
        select: mock.fn(() => user),
      }));
      const req = mockReq({
        body: {
          identifier: "test@test.com",
          password: "pw",
          codeChallenge: challenge,
          codeChallengeMethod: "S256",
          state: "random-state",
        },
      });
      const res = mockRes();
      await login(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      const data = res.json.mock.calls[0].arguments[0].data;
      assert.ok(data.authorizationCode);
      assert.strictEqual(data.state, "random-state");
      assert.strictEqual(data.email, "test@test.com");
    });
  });

  describe("token (PKCE exchange)", () => {
    it("should return 400 for invalid grant_type", async () => {
      const req = mockReq({ body: { grant_type: "password" } });
      const res = mockRes();
      await token(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it("should return 400 when code or code_verifier is missing", async () => {
      const req = mockReq({
        body: { grant_type: "authorization_code", code: "abc" },
      });
      const res = mockRes();
      await token(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it("should return 400 for unknown authorization code", async () => {
      const req = mockReq({
        body: {
          grant_type: "authorization_code",
          code: "nonexistent",
          code_verifier: "v",
        },
      });
      const res = mockRes();
      await token(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it("should complete full PKCE flow: login then token exchange", async () => {
      const verifier = "secure-verifier-for-test-flow";
      const challenge = buildCodeChallenge(verifier);
      const user = {
        id: "u2",
        email: "pkce@test.com",
        username: "pkceuser",
        validatePassword: mock.fn(async () => true),
        toObject: mock.fn(() => ({ id: "u2" })),
      };

      // Step 1: login with PKCE to get auth code
      mockUserFindOne.mock.mockImplementation(() => ({
        select: mock.fn(() => user),
      }));
      const loginReq = mockReq({
        body: {
          identifier: "pkce@test.com",
          password: "pw",
          codeChallenge: challenge,
          codeChallengeMethod: "S256",
        },
      });
      const loginRes = mockRes();
      await login(loginReq, loginRes);
      const authCode =
        loginRes.json.mock.calls[0].arguments[0].data.authorizationCode;
      assert.ok(authCode, "authorization code should be returned");

      // Step 2: exchange code for session
      mockUserFindById.mock.mockImplementation(async () => ({
        ...user,
        toObject: user.toObject,
      }));
      const tokenReq = mockReq({
        body: {
          grant_type: "authorization_code",
          code: authCode,
          code_verifier: verifier,
        },
      });
      const tokenRes = mockRes();
      await token(tokenReq, tokenRes);
      assert.strictEqual(tokenRes.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(mockCreateUserAuthState.mock.calls.length, 1);
    });

    it("should return 400 when auth code is replayed", async () => {
      const verifier = "replay-test-verifier-string";
      const challenge = buildCodeChallenge(verifier);
      const user = {
        id: "u3",
        email: "replay@test.com",
        username: "replayuser",
        validatePassword: mock.fn(async () => true),
        toObject: mock.fn(() => ({ id: "u3" })),
      };

      mockUserFindOne.mock.mockImplementation(() => ({
        select: mock.fn(() => user),
      }));
      const loginReq = mockReq({
        body: {
          identifier: "replay@test.com",
          password: "pw",
          codeChallenge: challenge,
          codeChallengeMethod: "S256",
        },
      });
      const loginRes = mockRes();
      await login(loginReq, loginRes);
      const authCode =
        loginRes.json.mock.calls[0].arguments[0].data.authorizationCode;

      mockUserFindById.mock.mockImplementation(async () => ({
        ...user,
        toObject: user.toObject,
      }));

      // First use
      const tokenReq1 = mockReq({
        body: {
          grant_type: "authorization_code",
          code: authCode,
          code_verifier: verifier,
        },
      });
      await token(tokenReq1, mockRes());

      // Second use (replay attack)
      const tokenReq2 = mockReq({
        body: {
          grant_type: "authorization_code",
          code: authCode,
          code_verifier: verifier,
        },
      });
      const tokenRes2 = mockRes();
      await token(tokenReq2, tokenRes2);
      assert.strictEqual(tokenRes2.status.mock.calls[0].arguments[0], 400);
    });

    it("should return 400 when code_verifier does not match challenge", async () => {
      const verifier = "correct-verifier-value-xyz";
      const challenge = buildCodeChallenge(verifier);
      const user = {
        id: "u4",
        email: "mismatch@test.com",
        username: "mismatchuser",
        validatePassword: mock.fn(async () => true),
        toObject: mock.fn(() => ({ id: "u4" })),
      };

      mockUserFindOne.mock.mockImplementation(() => ({
        select: mock.fn(() => user),
      }));
      const loginReq = mockReq({
        body: {
          identifier: "mismatch@test.com",
          password: "pw",
          codeChallenge: challenge,
          codeChallengeMethod: "S256",
        },
      });
      const loginRes = mockRes();
      await login(loginReq, loginRes);
      const authCode =
        loginRes.json.mock.calls[0].arguments[0].data.authorizationCode;

      const tokenReq = mockReq({
        body: {
          grant_type: "authorization_code",
          code: authCode,
          code_verifier: "wrong-verifier",
        },
      });
      const tokenRes = mockRes();
      await token(tokenReq, tokenRes);
      assert.strictEqual(tokenRes.status.mock.calls[0].arguments[0], 400);
    });

    it("should return 400 when user no longer exists after code was issued", async () => {
      const verifier = "valid-verifier-no-user";
      const challenge = buildCodeChallenge(verifier);
      const user = {
        id: "u5",
        email: "gone@test.com",
        username: "goneuser",
        validatePassword: mock.fn(async () => true),
        toObject: mock.fn(() => ({ id: "u5" })),
      };

      mockUserFindOne.mock.mockImplementation(() => ({
        select: mock.fn(() => user),
      }));
      const loginReq = mockReq({
        body: {
          identifier: "gone@test.com",
          password: "pw",
          codeChallenge: challenge,
          codeChallengeMethod: "S256",
        },
      });
      const loginRes = mockRes();
      await login(loginReq, loginRes);
      const authCode =
        loginRes.json.mock.calls[0].arguments[0].data.authorizationCode;

      // User deleted between login and token exchange
      mockUserFindById.mock.mockImplementation(async () => null);

      const tokenReq = mockReq({
        body: {
          grant_type: "authorization_code",
          code: authCode,
          code_verifier: verifier,
        },
      });
      const tokenRes = mockRes();
      await token(tokenReq, tokenRes);
      assert.strictEqual(tokenRes.status.mock.calls[0].arguments[0], 400);
    });

    it("should return 500 when session creation fails during token exchange", async () => {
      const verifier = "session-fail-verifier";
      const challenge = buildCodeChallenge(verifier);
      const user = {
        id: "u6",
        email: "fail@test.com",
        username: "failuser",
        validatePassword: mock.fn(async () => true),
        toObject: mock.fn(() => ({ id: "u6" })),
      };

      mockUserFindOne.mock.mockImplementation(() => ({
        select: mock.fn(() => user),
      }));
      const loginReq = mockReq({
        body: {
          identifier: "fail@test.com",
          password: "pw",
          codeChallenge: challenge,
          codeChallengeMethod: "S256",
        },
      });
      const loginRes = mockRes();
      await login(loginReq, loginRes);
      const authCode =
        loginRes.json.mock.calls[0].arguments[0].data.authorizationCode;

      mockUserFindById.mock.mockImplementation(async () => ({
        ...user,
        toObject: user.toObject,
      }));
      mockCreateUserAuthState.mock.mockImplementation(async () => {
        throw new Error("session store down");
      });

      const tokenReq = mockReq({
        body: {
          grant_type: "authorization_code",
          code: authCode,
          code_verifier: verifier,
        },
      });
      const tokenRes = mockRes();
      await token(tokenReq, tokenRes);
      assert.strictEqual(tokenRes.status.mock.calls[0].arguments[0], 500);
    });
  });

  describe("logout", () => {
    it("should return 200 even if no session", async () => {
      const req = { session: null };
      const res = mockRes();
      await logout(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
    });

    it("should clear auth state and return 200", async () => {
      mockClearAuthState.mock.mockImplementation((req, cb) => cb());
      const req = mockReq();
      const res = mockRes();
      await logout(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(mockClearAuthState.mock.calls.length, 1);
    });

    it("should clear sid cookie on successful logout", async () => {
      mockClearAuthState.mock.mockImplementation((req, cb) => cb());
      const req = mockReq({ user: { id: "u1" } });
      const res = mockRes();
      await logout(req, res);
      assert.strictEqual(res.clearCookie.mock.calls[0].arguments[0], "sid");
    });

    it("should return 500 when clearAuthState throws", async () => {
      mockClearAuthState.mock.mockImplementation((req, cb) =>
        cb(new Error("destroy error")),
      );
      const req = mockReq();
      const res = mockRes();
      await logout(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 500);
    });
  });

  // ─── branch coverage for previously-uncovered paths ───────────────────────────

  describe("login — outer catch block", () => {
    it("returns 500 when User.findOne throws unexpectedly", async () => {
      mockUserFindOne.mock.mockImplementation(() => {
        throw new Error("database connection lost");
      });
      const req = mockReq({
        body: { identifier: "test@test.com", password: "pw" },
      });
      const res = mockRes();
      await login(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 500);
      assert.match(
        res.json.mock.calls[0].arguments[0].message,
        /failed to login/i,
      );
    });
  });

  describe("token — expired authorization code", () => {
    it("returns 400 when the code has passed its 5-minute expiry window", async () => {
      mock.timers.enable({ apis: ["Date"] });
      try {
        // At mocked time 0, login creates the auth code (createdAt = 0).
        const verifier = "expiry-branch-verifier";
        const challenge = buildCodeChallenge(verifier);
        const user = {
          id: "u-expiry",
          email: "expiry@test.com",
          username: "expiryUser",
          validatePassword: mock.fn(async () => true),
          toObject: mock.fn(() => ({ id: "u-expiry" })),
        };
        mockUserFindOne.mock.mockImplementation(() => ({
          select: mock.fn(() => user),
        }));
        const loginReq = mockReq({
          body: {
            identifier: "expiry@test.com",
            password: "pw",
            codeChallenge: challenge,
            codeChallengeMethod: "S256",
          },
        });
        const loginRes = mockRes();
        await login(loginReq, loginRes);
        const authCode =
          loginRes.json.mock.calls[0].arguments[0].data.authorizationCode;

        // Advance mocked time by 6 minutes — past the 5-minute CODE_EXPIRATION_TIME.
        mock.timers.tick(6 * 60 * 1000);

        const tokenReq = mockReq({
          body: {
            grant_type: "authorization_code",
            code: authCode,
            code_verifier: verifier,
          },
        });
        const tokenRes = mockRes();
        await token(tokenReq, tokenRes);
        assert.strictEqual(tokenRes.status.mock.calls[0].arguments[0], 400);
        assert.match(
          tokenRes.json.mock.calls[0].arguments[0].message,
          /expired/i,
        );
      } finally {
        mock.timers.reset();
      }
    });
  });

  describe("token — outer catch block", () => {
    it("returns 500 when User.findById throws unexpectedly", async () => {
      // Obtain a valid auth code via login first.
      const verifier = "outer-catch-verifier";
      const challenge = buildCodeChallenge(verifier);
      const user = {
        id: "u-outer",
        email: "outer@test.com",
        username: "outerUser",
        validatePassword: mock.fn(async () => true),
        toObject: mock.fn(() => ({ id: "u-outer" })),
      };
      mockUserFindOne.mock.mockImplementation(() => ({
        select: mock.fn(() => user),
      }));
      const loginReq = mockReq({
        body: {
          identifier: "outer@test.com",
          password: "pw",
          codeChallenge: challenge,
          codeChallengeMethod: "S256",
        },
      });
      const loginRes = mockRes();
      await login(loginReq, loginRes);
      const authCode =
        loginRes.json.mock.calls[0].arguments[0].data.authorizationCode;

      // Make findById throw to trigger the outer catch in the token handler.
      mockUserFindById.mock.mockImplementation(async () => {
        throw new Error("DB failure during token exchange");
      });
      const tokenReq = mockReq({
        body: {
          grant_type: "authorization_code",
          code: authCode,
          code_verifier: verifier,
        },
      });
      const tokenRes = mockRes();
      await token(tokenReq, tokenRes);
      assert.strictEqual(tokenRes.status.mock.calls[0].arguments[0], 500);
      assert.match(
        tokenRes.json.mock.calls[0].arguments[0].message,
        /failed to authenticate/i,
      );
    });
  });
});
