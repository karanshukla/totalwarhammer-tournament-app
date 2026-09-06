import assert from "node:assert";
import { describe, it, beforeEach, mock } from "node:test";

const mockUserFindOne = mock.fn();
const mockUserCreate = mock.fn();
const mockUserFindByIdAndUpdate = mock.fn();
const mockUserFindById = mock.fn();

const mockMatchFind = mock.fn();
const mockTournamentCountDocuments = mock.fn();
const mockTournamentFind = mock.fn();

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
    find: mockTournamentFind,
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

// Stand up the four queries getUserStats issues, with `testuser` winning one
// completed match per requested faction.
function stubUserStatsQueries({ factions = ["Empire"] } = {}) {
  mockUserFindById.mock.mockImplementation(() => ({
    select: mock.fn(() => ({
      lean: mock.fn(async () => ({ username: "testuser" })),
    })),
  }));
  mockTournamentFind.mock.mockImplementation(() => ({
    select: mock.fn(() => ({
      lean: mock.fn(async () => [{ _id: "tour1" }]),
    })),
  }));
  mockTournamentCountDocuments.mock.mockImplementation(async () => 3);
  mockMatchFind.mock.mockImplementation(() => ({
    select: mock.fn(() => ({
      lean: mock.fn(async () =>
        factions.map((faction) => ({
          player1: { name: "testuser", faction, participantId: "p1" },
          player2: { name: "other", faction: "Skaven", participantId: "p2" },
          winnerId: "p1",
        })),
      ),
    })),
  }));
}

describe("user-controller", () => {
  beforeEach(() => {
    mockUserFindOne.mock.resetCalls();
    mockUserCreate.mock.resetCalls();
    mockUserFindByIdAndUpdate.mock.resetCalls();
    mockUserFindById.mock.resetCalls();
    mockMatchFind.mock.resetCalls();
    mockTournamentFind.mock.resetCalls();
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
    it("should return 403 for a guest account", async () => {
      const req = mockReq({
        body: { username: "new" },
        user: { id: "u1", isGuest: true },
      });
      const res = mockRes();
      await updateUsername(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 403);
      assert.strictEqual(mockUserFindOne.mock.calls.length, 0);
    });

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

    it("should return 500 when session.save fails", async () => {
      mockUserFindOne.mock.mockImplementation(() => null);
      mockUserFindByIdAndUpdate.mock.mockImplementation(async (id) => ({
        id,
        username: "new",
        email: "e@t.com",
      }));
      const req = mockReq({
        body: { username: "new" },
        session: {
          user: {},
          save: mock.fn((cb) => cb(new Error("save failed"))),
        },
      });
      const res = mockRes();
      await updateUsername(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 500);
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
    it("should return 403 for a guest account", async () => {
      const req = mockReq({
        body: { currentPassword: "old", newPassword: "new" },
        user: { id: "u1", isGuest: true },
      });
      const res = mockRes();
      await updatePassword(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 403);
      assert.strictEqual(mockUserFindById.mock.calls.length, 0);
    });

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
      // passwordChangedAt is stamped so older sessions are invalidated (#101)
      assert.ok(user.passwordChangedAt instanceof Date);
    });

    it("sets passwordChangedAt and refreshes the current session's authAt (issue #101)", async () => {
      const user = {
        password: "oldhash",
        validatePassword: mock.fn(async () => true),
        save: mock.fn(async () => {}),
      };
      mockUserFindById.mock.mockImplementation(() => ({
        select: mock.fn(async () => user),
      }));
      const session = {
        save: mock.fn((cb) => cb()),
      };
      const req = mockReq({
        body: { currentPassword: "old", newPassword: "newpass" },
        session,
      });
      const res = mockRes();
      await updatePassword(req, res);

      // passwordChangedAt is set on the user record
      assert.ok(user.passwordChangedAt instanceof Date);
      // The current session is refreshed so it survives its own password change
      assert.ok(req.session.authAt instanceof Date);
      assert.strictEqual(session.save.mock.calls.length, 1);
      // authAt is at/after passwordChangedAt → the changing device stays logged in
      assert.ok(
        new Date(req.session.authAt).getTime() >=
          new Date(user.passwordChangedAt).getTime(),
      );
    });

    it("does not crash when no session is present on the request (issue #101)", async () => {
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
        // no session key
      });
      const res = mockRes();
      await updatePassword(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.ok(user.passwordChangedAt instanceof Date);
    });

    it("should return 500 when session.save fails", async () => {
      const user = {
        password: "oldhash",
        validatePassword: mock.fn(async () => true),
        save: mock.fn(async () => {}),
      };
      mockUserFindById.mock.mockImplementation(() => ({
        select: mock.fn(async () => user),
      }));
      const session = {
        save: mock.fn((cb) => cb(new Error("save failed"))),
      };
      const req = mockReq({
        body: { currentPassword: "old", newPassword: "newpass" },
        session,
      });
      const res = mockRes();
      await updatePassword(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 500);
    });
  });

  describe("deleteAccount", () => {
    it("should return 403 for a guest account", async () => {
      const req = mockReq({
        session: { destroy: mock.fn((cb) => cb()) },
        user: { id: "u1", isGuest: true },
      });
      const res = mockRes();
      await deleteAccount(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 403);
      assert.strictEqual(mockUserFindByIdAndUpdate.mock.calls.length, 0);
    });

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
    it("should return 403 for a guest account", async () => {
      const req = mockReq({ user: { id: "u1", isGuest: true } });
      const res = mockRes();
      await getUserStats(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 403);
      assert.strictEqual(mockUserFindById.mock.calls.length, 0);
    });

    it("should return 404 if user not found", async () => {
      mockUserFindById.mock.mockImplementation(() => ({
        select: mock.fn(() => ({ lean: mock.fn(async () => null) })),
      }));
      const req = mockReq();
      const res = mockRes();
      await getUserStats(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 404);
    });

    it("should return nested wh3/40k stats with wins and losses", async () => {
      mockUserFindById.mock.mockImplementation(() => ({
        select: mock.fn(() => ({
          lean: mock.fn(async () => ({ username: "testuser" })),
        })),
      }));
      mockTournamentFind.mock.mockImplementation(() => ({
        select: mock.fn(() => ({
          lean: mock.fn(async () => [{ _id: "tour1" }, { _id: "tour2" }]),
        })),
      }));
      mockTournamentCountDocuments.mock.mockImplementation(async () => 3);
      // Every Match.find returns one win (as player1) — same for wh3 and 40k.
      mockMatchFind.mock.mockImplementation(() => ({
        select: mock.fn(() => ({
          lean: mock.fn(async () => [
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
          ]),
        })),
      }));
      const req = mockReq();
      const res = mockRes();
      await getUserStats(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      const data = res.json.mock.calls[0].arguments[0].data;
      // Nested shape: both game keys present.
      assert.ok("wh3" in data);
      assert.ok("40k" in data);
      // wh3: each Match.find call returns one match where testuser is player1
      // and wins — so 2 matches and 2 wins per game.
      assert.strictEqual(data.wh3.tournamentsCreated, 3);
      assert.strictEqual(data.wh3.matchesPlayed, 2);
      assert.strictEqual(data.wh3.wins, 2);
      assert.strictEqual(data.wh3.losses, 0);
      assert.strictEqual(data.wh3.factions.length, 1);
      // 40k mirrors the same mocked data.
      assert.strictEqual(data["40k"].matchesPlayed, 2);
      assert.strictEqual(data["40k"].wins, 2);
    });

    it("should omit per-faction wins unless detail=full is requested", async () => {
      stubUserStatsQueries();

      const summary = mockRes();
      await getUserStats(mockReq(), summary);
      assert.deepStrictEqual(
        summary.json.mock.calls[0].arguments[0].data.wh3.factions,
        [{ name: "Empire", count: 2 }],
      );

      const full = mockRes();
      await getUserStats(mockReq({ query: { detail: "full" } }), full);
      assert.deepStrictEqual(
        full.json.mock.calls[0].arguments[0].data.wh3.factions,
        [{ name: "Empire", count: 2, wins: 2 }],
      );
    });

    it("should scope match queries to the requested range and echo it back", async () => {
      stubUserStatsQueries();

      const res = mockRes();
      const before = Date.now();
      await getUserStats(mockReq({ query: { range: "7d" } }), res);

      const since = mockMatchFind.mock.calls[0].arguments[0].completedAt.$gte;
      const ageDays = (before - since.getTime()) / (24 * 60 * 60 * 1000);
      assert.ok(Math.abs(ageDays - 7) < 0.01);
      assert.strictEqual(res.json.mock.calls[0].arguments[0].data.range, "7d");
    });

    it("should leave match queries unbounded for the default all-time range", async () => {
      stubUserStatsQueries();

      await getUserStats(mockReq(), mockRes());

      assert.ok(!("completedAt" in mockMatchFind.mock.calls[0].arguments[0]));
    });

    it("should keep tournamentsCreated all-time regardless of range", async () => {
      stubUserStatsQueries();

      const res = mockRes();
      await getUserStats(mockReq({ query: { range: "7d" } }), res);

      const createdFilter =
        mockTournamentCountDocuments.mock.calls[0].arguments[0];
      assert.deepStrictEqual(Object.keys(createdFilter).sort(), [
        "createdBy",
        "enable40kFactions",
      ]);
      assert.strictEqual(
        res.json.mock.calls[0].arguments[0].data.wh3.tournamentsCreated,
        3,
      );
    });

    it("should page the faction list while reporting the full total", async () => {
      stubUserStatsQueries({
        factions: ["Empire", "Skaven", "Greenskins", "Dwarfs"],
      });

      const res = mockRes();
      await getUserStats(mockReq({ query: { limit: 2, offset: 1 } }), res);

      const wh3 = res.json.mock.calls[0].arguments[0].data.wh3;
      assert.strictEqual(wh3.factions.length, 2);
      assert.strictEqual(wh3.factionsTotal, 4);
    });

    it("should return 500 on unexpected error", async () => {
      mockUserFindById.mock.mockImplementation(() => {
        throw new Error("db error");
      });
      const req = mockReq();
      const res = mockRes();
      await getUserStats(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 500);
    });
  });

  describe("userExists - extra validation paths", () => {
    it("should return 400 if identifier is a non-string type", async () => {
      // Pass an array — query params parsed as array counts as non-string
      const req = mockReq({ query: { identifier: ["a", "b"] } });
      const res = mockRes();
      await userExists(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it("should return 500 on unexpected DB error", async () => {
      mockUserFindOne.mock.mockImplementation(() => {
        throw new Error("db error");
      });
      const req = mockReq({ query: { identifier: "test" } });
      const res = mockRes();
      await userExists(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 500);
    });
  });

  describe("register - extra validation paths", () => {
    it("should return 400 if username is not a string", async () => {
      mockUserFindOne.mock.mockImplementation(() => null); // no existing email
      const req = mockReq({
        body: { username: 42, email: "new@test.com", password: "pw" },
      });
      const res = mockRes();
      await register(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it("should return 400 if username already taken", async () => {
      let callCount = 0;
      mockUserFindOne.mock.mockImplementation(() => {
        callCount++;
        // first call (email check) → null; second call (username check) → taken
        return callCount === 1 ? null : { username: "taken" };
      });
      const req = mockReq({
        body: { username: "taken", email: "new@test.com", password: "pw" },
      });
      const res = mockRes();
      await register(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it("should return 500 on unexpected error during registration", async () => {
      mockUserFindOne.mock.mockImplementation(() => null);
      mockUserCreate.mock.mockImplementation(async () => {
        throw new Error("db error");
      });
      const req = mockReq({
        body: { username: "newuser", email: "new@test.com", password: "pw" },
      });
      const res = mockRes();
      await register(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 500);
    });
  });

  describe("updateUsername - extra validation paths", () => {
    it("should return 400 if username is not a string", async () => {
      const req = mockReq({
        body: { username: 123 },
        user: { id: "u1" },
      });
      const res = mockRes();
      await updateUsername(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it("should return 404 if user not found after update", async () => {
      mockUserFindOne.mock.mockImplementation(() => null);
      mockUserFindByIdAndUpdate.mock.mockImplementation(async () => null);
      const req = mockReq({
        body: { username: "newname" },
        user: { id: "u1" },
      });
      const res = mockRes();
      await updateUsername(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 404);
    });

    it("should return 500 on unexpected error", async () => {
      mockUserFindOne.mock.mockImplementation(() => {
        throw new Error("db error");
      });
      const req = mockReq({
        body: { username: "newname" },
        user: { id: "u1" },
      });
      const res = mockRes();
      await updateUsername(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 500);
    });
  });

  describe("updatePassword - extra paths", () => {
    it("should return 500 on unexpected error", async () => {
      mockUserFindById.mock.mockImplementation(() => {
        throw new Error("db error");
      });
      const req = mockReq({
        body: { currentPassword: "old", newPassword: "new" },
        user: { id: "u1" },
      });
      const res = mockRes();
      await updatePassword(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 500);
    });
  });

  describe("deleteAccount - extra paths", () => {
    it("should return 500 when session destroy fails", async () => {
      mockUserFindByIdAndUpdate.mock.mockImplementation(async () => ({
        id: "u1",
      }));
      const req = mockReq({
        user: { id: "u1" },
        session: { destroy: mock.fn((cb) => cb(new Error("destroy error"))) },
      });
      const res = mockRes();
      await deleteAccount(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 500);
    });

    it("should return 500 on unexpected DB error", async () => {
      mockUserFindByIdAndUpdate.mock.mockImplementation(async () => {
        throw new Error("db error");
      });
      const req = mockReq({
        user: { id: "u1" },
        session: { destroy: mock.fn((cb) => cb()) },
      });
      const res = mockRes();
      await deleteAccount(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 500);
    });
  });
});
