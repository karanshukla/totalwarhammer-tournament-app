import assert from "node:assert";
import { describe, it, beforeEach, mock } from "node:test";

const mockUserFindOne = mock.fn();
const mockUserCreate = mock.fn();
const mockUserFindByIdAndUpdate = mock.fn();
const mockUserFindById = mock.fn();

const mockMatchFind = mock.fn();
const mockTournamentCountDocuments = mock.fn();

mock.module("../domain/models/user.js", {
  defaultExport: {
    findOne: mockUserFindOne,
    create: mockUserCreate,
    findByIdAndUpdate: mockUserFindByIdAndUpdate,
    findById: mockUserFindById,
  },
});

mock.module("../domain/models/match.js", {
  defaultExport: {
    find: mockMatchFind,
  },
});

mock.module("../domain/models/tournament.js", {
  defaultExport: {
    countDocuments: mockTournamentCountDocuments,
  },
});

mock.module("bcrypt", {
  defaultExport: {
    hash: mock.fn(async (pw) => "hashed_" + pw),
  },
});

const {
  userExists,
  register,
  updateUsername,
  updatePassword,
  deleteAccount,
  getUserStats,
} = await import("../interfaces/http/controllers/user-controller.js");

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
    query: {},
    params: {},
    user: { id: "u1" },
    ...overrides,
  };
}

describe("user-controller", () => {
  beforeEach(() => {
    mockUserFindOne.mock.resetCalls();
    mockUserCreate.mock.resetCalls();
    mockUserFindByIdAndUpdate.mock.resetCalls();
    mockUserFindById.mock.resetCalls();
    mockMatchFind.mock.resetCalls();
    mockTournamentCountDocuments.mock.resetCalls();
  });

  describe("userExists", () => {
    it("should return 400 if identifier missing", async () => {
      const req = mockReq();
      const res = mockRes();
      await userExists(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it("should return exists: true if user found", async () => {
      mockUserFindOne.mock.mockImplementation(() => ({ username: "test" }));
      const req = mockReq({ query: { identifier: "test" } });
      const res = mockRes();
      await userExists(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(res.json.mock.calls[0].arguments[0].data.exists, true);
    });

    it("should return exists: false if user not found", async () => {
      mockUserFindOne.mock.mockImplementation(() => null);
      const req = mockReq({ query: { identifier: "missing" } });
      const res = mockRes();
      await userExists(req, res);
      assert.strictEqual(
        res.json.mock.calls[0].arguments[0].data.exists,
        false,
      );
    });
  });

  describe("register", () => {
    it("should return 400 if email already in use", async () => {
      mockUserFindOne.mock.mockImplementation(() => ({
        email: "exists@test.com",
      }));
      const req = mockReq({
        body: { username: "new", email: "exists@test.com", password: "pw" },
      });
      const res = mockRes();
      await register(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it("should create user and return 201", async () => {
      mockUserFindOne.mock.mockImplementation(() => null);
      mockUserCreate.mock.mockImplementation(async (data) => ({
        ...data,
        id: "u1",
      }));
      const req = mockReq({
        body: { username: "new", email: "new@test.com", password: "pw" },
      });
      const res = mockRes();
      await register(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 201);
      assert.strictEqual(mockUserCreate.mock.calls.length, 1);
    });
  });

  describe("updateUsername", () => {
    it("should return 400 if username taken", async () => {
      mockUserFindOne.mock.mockImplementation(() => ({ username: "taken" }));
      const req = mockReq({ body: { username: "taken" } });
      const res = mockRes();
      await updateUsername(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it("should update and return 200", async () => {
      mockUserFindOne.mock.mockImplementation(() => null);
      mockUserFindByIdAndUpdate.mock.mockImplementation(async (id, _data) => ({
        id,
        username: "new",
        email: "e@t.com",
      }));
      const req = mockReq({
        body: { username: "new" },
        session: { user: {}, save: mock.fn((cb) => cb()) },
      });
      const res = mockRes();
      await updateUsername(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(
        res.json.mock.calls[0].arguments[0].data.username,
        "new",
      );
    });

    it("should pass a plain string value to $set, not a query operator", async () => {
      mockUserFindOne.mock.mockImplementation(() => null);
      let capturedUpdate;
      mockUserFindByIdAndUpdate.mock.mockImplementation(async (_id, update) => {
        capturedUpdate = update;
        return { id: "u1", username: "newname", email: "e@t.com" };
      });
      const req = mockReq({
        body: { username: "newname" },
        session: { user: {}, save: mock.fn((cb) => cb()) },
      });
      const res = mockRes();
      await updateUsername(req, res);
      assert.strictEqual(typeof capturedUpdate.$set.username, "string");
      assert.strictEqual(capturedUpdate.$set.username, "newname");
    });
  });

  describe("updatePassword", () => {
    it("should return 404 if user not found", async () => {
      mockUserFindById.mock.mockImplementation(() => ({
        select: mock.fn(async () => null),
      }));
      const req = mockReq({
        body: { currentPassword: "old", newPassword: "new" },
      });
      const res = mockRes();
      await updatePassword(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 404);
    });

    it("should return 401 if current password is wrong", async () => {
      const user = {
        validatePassword: mock.fn(async () => false),
        save: mock.fn(),
      };
      mockUserFindById.mock.mockImplementation(() => ({
        select: mock.fn(async () => user),
      }));
      const req = mockReq({
        body: { currentPassword: "wrong", newPassword: "new" },
      });
      const res = mockRes();
      await updatePassword(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 401);
    });

    it("should update password and return 200", async () => {
      const user = {
        password: "oldhash",
        validatePassword: mock.fn(async () => true),
        save: mock.fn(async () => {}),
      };
      mockUserFindById.mock.mockImplementation(() => ({
        select: mock.fn(async () => user),
      }));
      const req = mockReq({
        body: { currentPassword: "old", newPassword: "newpass" },
      });
      const res = mockRes();
      await updatePassword(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(res.json.mock.calls[0].arguments[0].success, true);
      assert.strictEqual(user.password, "hashed_newpass");
      assert.strictEqual(user.save.mock.calls.length, 1);
    });
  });

  describe("deleteAccount", () => {
    it("should return 404 if user not found", async () => {
      mockUserFindByIdAndUpdate.mock.mockImplementation(async () => null);
      const req = mockReq({
        session: { destroy: mock.fn((cb) => cb()) },
      });
      const res = mockRes();
      await deleteAccount(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 404);
    });

    it("should anonymise user, destroy session and return 200", async () => {
      mockUserFindByIdAndUpdate.mock.mockImplementation(async () => ({
        id: "u1",
      }));
      const req = mockReq({
        session: { destroy: mock.fn((cb) => cb()) },
      });
      const res = mockRes();
      await deleteAccount(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(res.json.mock.calls[0].arguments[0].success, true);
    });

    it("should clear the sid cookie (not connect.sid)", async () => {
      mockUserFindByIdAndUpdate.mock.mockImplementation(async () => ({
        id: "u1",
      }));
      const req = mockReq({
        session: { destroy: mock.fn((cb) => cb()) },
      });
      const res = mockRes();
      await deleteAccount(req, res);
      assert.strictEqual(res.clearCookie.mock.calls[0].arguments[0], "sid");
    });
  });

  describe("getUserStats", () => {
    it("should return 404 if user not found", async () => {
      mockUserFindById.mock.mockImplementation(() => ({
        select: mock.fn(() => ({ lean: mock.fn(async () => null) })),
      }));
      const req = mockReq();
      const res = mockRes();
      await getUserStats(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 404);
    });

    it("should return stats with wins and losses", async () => {
      mockUserFindById.mock.mockImplementation(() => ({
        select: mock.fn(() => ({
          lean: mock.fn(async () => ({ username: "testuser" })),
        })),
      }));
      mockTournamentCountDocuments.mock.mockImplementation(async () => 3);
      let matchFindCallCount = 0;
      mockMatchFind.mock.mockImplementation(() => ({
        select: mock.fn(() => ({
          lean: mock.fn(async () => {
            matchFindCallCount++;
            if (matchFindCallCount === 1) {
              return [
                {
                  player1: {
                    name: "testuser",
                    faction: "Empire",
                    participantId: "p1",
                  },
                  player2: {
                    name: "other",
                    faction: "Skaven",
                    participantId: "p2",
                  },
                  winnerId: "p1",
                },
              ];
            }
            return [
              {
                player1: {
                  name: "other",
                  faction: "Skaven",
                  participantId: "p2",
                },
                player2: {
                  name: "testuser",
                  faction: "Empire",
                  participantId: "p1",
                },
                winnerId: "p2",
              },
            ];
          }),
        })),
      }));
      const req = mockReq();
      const res = mockRes();
      await getUserStats(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      const data = res.json.mock.calls[0].arguments[0].data;
      assert.strictEqual(data.tournamentsCreated, 3);
      assert.strictEqual(data.matchesPlayed, 2);
      assert.strictEqual(data.wins, 1);
    });
  });
});
