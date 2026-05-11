import assert from "node:assert";
import { describe, it, beforeEach, mock } from "node:test";

const mockCreateGuestAuthState = mock.fn();
const mockTournamentUpdateMany = mock.fn();

mock.module("../domain/models/tournament.js", {
  defaultExport: {
    updateMany: mockTournamentUpdateMany,
  },
});

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

const { createGuestUser, updateGuestUsername } =
  await import("../interfaces/http/controllers/guest-controller.js");

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
    mockTournamentUpdateMany.mock.resetCalls();
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
      mockTournamentUpdateMany.mock.mockImplementation(async () => ({
        modifiedCount: 0,
      }));
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

    it("should propagate new username to tournament participants", async () => {
      mockTournamentUpdateMany.mock.mockImplementation(async () => ({
        modifiedCount: 2,
      }));
      const req = mockReq({
        body: { username: "new_name" },
        user: { id: "u1", username: "old_name", isGuest: true },
        session: {
          user: { username: "old_name" },
          save: mock.fn((cb) => cb()),
          touch: mock.fn(),
        },
      });
      const res = mockRes();
      await updateGuestUsername(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(mockTournamentUpdateMany.mock.calls.length, 1);
      const [filter, update, options] =
        mockTournamentUpdateMany.mock.calls[0].arguments;
      assert.deepStrictEqual(filter, { "participants.name": "old_name" });
      assert.deepStrictEqual(update, {
        $set: { "participants.$[elem].name": "new_name" },
      });
      assert.deepStrictEqual(options, {
        arrayFilters: [{ "elem.name": "old_name" }],
      });
    });

    it("should not call Tournament.updateMany if no old username", async () => {
      mockTournamentUpdateMany.mock.mockImplementation(async () => ({}));
      const req = mockReq({
        body: { username: "new_name" },
        user: { id: "u1", username: undefined, isGuest: true },
        session: {
          user: {},
          save: mock.fn((cb) => cb()),
          touch: mock.fn(),
        },
      });
      const res = mockRes();
      await updateGuestUsername(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(mockTournamentUpdateMany.mock.calls.length, 0);
    });

    it("should return 400 for username with invalid characters", async () => {
      const req = mockReq({
        body: { username: "bad name!" },
        user: { id: "u1", isGuest: true },
      });
      const res = mockRes();
      await updateGuestUsername(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it("should return 401 if req.user is missing", async () => {
      const req = mockReq({
        body: { username: "valid_name" },
        user: null,
      });
      const res = mockRes();
      await updateGuestUsername(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 401);
    });
  });
});
