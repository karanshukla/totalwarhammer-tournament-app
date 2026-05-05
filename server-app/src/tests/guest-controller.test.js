import assert from "node:assert";
import { describe, it, beforeEach, mock } from "node:test";

const mockCreateGuestAuthState = mock.fn();

mock.module("../infrastructure/services/auth-state-service.js", {
  defaultExport: class {
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

const { createGuestUser, updateGuestUsername } = await import(
  "../interfaces/http/controllers/guest-controller.js"
);

function mockRes() {
  const res = {};
  res.status = mock.fn(() => res);
  res.json = mock.fn(() => res);
  return res;
}

function mockReq(overrides = {}) {
  return {
    body: {},
    session: {
      cookie: { maxAge: 1000 },
      save: mock.fn((cb) => cb()),
      touch: mock.fn(),
    },
    ...overrides,
  };
}

describe("guest-controller", () => {
  beforeEach(() => {
    mockCreateGuestAuthState.mock.resetCalls();
  });

  describe("createGuestUser", () => {
    it("should create a guest user and return 200", async () => {
      const req = mockReq();
      const res = mockRes();
      await createGuestUser(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(mockCreateGuestAuthState.mock.calls.length, 1);
      const data = res.json.mock.calls[0].arguments[0].data;
      assert.ok(data.id);
      assert.ok(data.username.startsWith("Guest_"));
      assert.strictEqual(data.isGuest, true);
    });
  });

  describe("updateGuestUsername", () => {
    it("should return 400 for invalid username", async () => {
      const req = mockReq({ body: { username: "a" } }); // too short
      const res = mockRes();
      await updateGuestUsername(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it("should return 403 if user is not a guest", async () => {
      const req = mockReq({
        body: { username: "valid_name" },
        user: { id: "u1", isGuest: false },
      });
      const res = mockRes();
      await updateGuestUsername(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 403);
    });

    it("should update guest username and return 200", async () => {
      const req = mockReq({
        body: { username: "valid_name" },
        user: { id: "u1", isGuest: true },
        session: {
          user: { username: "old" },
          save: mock.fn((cb) => cb()),
          touch: mock.fn(),
        },
      });
      const res = mockRes();
      await updateGuestUsername(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(req.user.username, "valid_name");
      assert.strictEqual(req.session.user.username, "valid_name");
    });
  });
});
