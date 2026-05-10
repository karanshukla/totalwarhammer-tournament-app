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

const { login, logout } = await import(
  "../interfaces/http/controllers/authentication-controller.js"
);

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

describe("authentication-controller", () => {
  beforeEach(() => {
    mockUserFindOne.mock.resetCalls();
    mockUserFindById.mock.resetCalls();
    mockValidatePassword.mock.resetCalls();
    mockCreateUserAuthState.mock.resetCalls();
    mockClearAuthState.mock.resetCalls();
  });

  describe("login", () => {
    it("should return 400 if email or password missing", async () => {
      const req = mockReq({ body: { email: "test@test.com" } });
      const res = mockRes();
      await login(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it("should return 401 if user not found", async () => {
      mockUserFindOne.mock.mockImplementation(() => ({
        select: mock.fn(() => null),
      }));
      const req = mockReq({ body: { email: "test@test.com", password: "pw" } });
      const res = mockRes();
      await login(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 401);
    });

    it("should return 401 if password invalid", async () => {
      const user = {
        validatePassword: mock.fn(async () => false),
      };
      mockUserFindOne.mock.mockImplementation(() => ({
        select: mock.fn(() => user),
      }));
      const req = mockReq({ body: { email: "test@test.com", password: "pw" } });
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
      const req = mockReq({ body: { email: "test@test.com", password: "pw" } });
      const res = mockRes();
      await login(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(mockCreateUserAuthState.mock.calls.length, 1);
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
  });
});
