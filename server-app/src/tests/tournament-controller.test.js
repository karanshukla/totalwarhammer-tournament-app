import assert from "node:assert";
import { describe, it, beforeEach, mock } from "node:test";

const mockSave = mock.fn();
const mockTournamentInstance = {
  save: mockSave,
  deleteOne: mock.fn(),
};

const mockTournamentCreate = mock.fn();
const mockTournamentFind = mock.fn();
const mockTournamentFindOne = mock.fn();
const mockTournamentFindOneAndUpdate = mock.fn();
const mockTournamentFindById = mock.fn();
const mockTournamentFindByIdAndUpdate = mock.fn();

mock.module("../domain/models/tournament.js", {
  namedExports: {},
  defaultExport: {
    create: mockTournamentCreate,
    find: mockTournamentFind,
    findOne: mockTournamentFindOne,
    findOneAndUpdate: mockTournamentFindOneAndUpdate,
    findById: mockTournamentFindById,
    findByIdAndUpdate: mockTournamentFindByIdAndUpdate,
  },
});

mock.module("../infrastructure/utils/logger.js", {
  defaultExport: {
    error: mock.fn(),
    info: mock.fn(),
    debug: mock.fn(),
  },
});

mock.module("../domain/models/match.js", {
  namedExports: {},
  defaultExport: {
    insertMany: mock.fn(async () => []),
  },
});

const {
  createTournament,
  getTournaments,
  getTournamentById,
  getTournamentByCode,
  getUserTournaments,
  addParticipant,
  removeParticipant,
  joinTournament,
  updateDescription,
  deleteTournament,
} = await import("../interfaces/http/controllers/tournament-controller.js");

function mockRes() {
  const res = {};
  res.status = mock.fn(() => res);
  res.json = mock.fn(() => res);
  return res;
}

function mockReq(overrides = {}) {
  return {
    body: {},
    params: {},
    query: {},
    user: { id: "user123" },
    ...overrides,
  };
}

describe("tournament-controller", () => {
  beforeEach(() => {
    mockTournamentCreate.mock.resetCalls();
    mockTournamentFind.mock.resetCalls();
    mockTournamentFindOne.mock.resetCalls();
    mockTournamentFindOneAndUpdate.mock.resetCalls();
    mockTournamentFindById.mock.resetCalls();
    mockTournamentFindByIdAndUpdate.mock.resetCalls();
    mockTournamentInstance.deleteOne.mock.resetCalls();
  });

  describe("createTournament", () => {
    it("should create a tournament and return 201", async () => {
      const body = {
        name: "My Tournament",
        description: "A test tournament",
        playerCount: 8,
        tournamentType: "Single Elimination",
        bannedFactions: ["Skaven"],
      };
      const created = { ...body, _id: "t1", createdBy: "user123" };
      mockTournamentCreate.mock.mockImplementation(async () => created);

      const req = mockReq({ body });
      const res = mockRes();

      await createTournament(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 201);
      const json = res.json.mock.calls[0].arguments[0];
      assert.strictEqual(json.success, true);
      assert.deepStrictEqual(json.data, created);
    });

    it("should return 500 when create throws", async () => {
      mockTournamentCreate.mock.mockImplementation(async () => {
        throw new Error("DB error");
      });

      const req = mockReq({ body: { name: "x" } });
      const res = mockRes();

      await createTournament(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 500);
      assert.strictEqual(res.json.mock.calls[0].arguments[0].success, false);
    });

    it("should use empty string for missing description", async () => {
      const body = {
        name: "No Desc",
        playerCount: 4,
        tournamentType: "Round Robin",
      };
      mockTournamentCreate.mock.mockImplementation(async (data) => data);

      const req = mockReq({ body });
      const res = mockRes();

      await createTournament(req, res);

      const called = mockTournamentCreate.mock.calls[0].arguments[0];
      assert.strictEqual(called.createdBy, "user123");
      assert.strictEqual(called.description, "");
    });

    it("should use empty array for missing bannedFactions", async () => {
      const body = {
        name: "No Bans",
        playerCount: 4,
        tournamentType: "Round Robin",
      };
      mockTournamentCreate.mock.mockImplementation(async (data) => data);

      const req = mockReq({ body });
      const res = mockRes();

      await createTournament(req, res);

      const called = mockTournamentCreate.mock.calls[0].arguments[0];
      assert.deepStrictEqual(called.bannedFactions, []);
    });
  });

  describe("getTournamentById", () => {
    it("should return 404 if tournament not found", async () => {
      mockTournamentFindById.mock.mockImplementation(async () => null);
      const req = mockReq({ params: { id: "t1" } });
      const res = mockRes();
      await getTournamentById(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 404);
    });

    it("should return tournament with 200 if found", async () => {
      const tournament = {
        _id: "t1",
        name: "My T",
        code: "ABC123",
        save: mock.fn(async () => {}),
      };
      mockTournamentFindById.mock.mockImplementation(async () => tournament);
      mockTournamentFindByIdAndUpdate.mock.mockImplementation(
        async () => tournament,
      );
      const req = mockReq({ params: { id: "t1" } });
      const res = mockRes();
      await getTournamentById(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(res.json.mock.calls[0].arguments[0].success, true);
    });
  });

  describe("getTournamentByCode", () => {
    it("should return 404 if no tournament matches code", async () => {
      mockTournamentFindOne.mock.mockImplementation(async () => null);
      const req = mockReq({ params: { code: "XXXXXX" } });
      const res = mockRes();
      await getTournamentByCode(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 404);
    });

    it("should return tournament with 200 when code matches", async () => {
      const tournament = { _id: "t1", code: "ABC123" };
      mockTournamentFindOne.mock.mockImplementation(async () => tournament);
      const req = mockReq({ params: { code: "abc123" } });
      const res = mockRes();
      await getTournamentByCode(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.deepStrictEqual(
        res.json.mock.calls[0].arguments[0].data,
        tournament,
      );
    });
  });

  describe("getTournaments", () => {
    it("should return all tournaments with status 200", async () => {
      const tournaments = [{ name: "T1" }, { name: "T2" }];
      const chain = {
        populate: mock.fn(function () {
          return this;
        }),
        sort: mock.fn(async () => tournaments),
      };
      mockTournamentFind.mock.mockImplementation(() => chain);

      const req = mockReq({ query: {} });
      const res = mockRes();

      await getTournaments(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.deepStrictEqual(
        res.json.mock.calls[0].arguments[0].data,
        tournaments,
      );
    });

    it("should pass status filter when provided", async () => {
      const chain = {
        populate: mock.fn(function () {
          return this;
        }),
        sort: mock.fn(async () => []),
      };
      mockTournamentFind.mock.mockImplementation(() => chain);

      const req = mockReq({ query: { status: "active" } });
      const res = mockRes();

      await getTournaments(req, res);

      assert.deepStrictEqual(mockTournamentFind.mock.calls[0].arguments[0], {
        status: "active",
      });
    });

    it("should return 500 on error", async () => {
      mockTournamentFind.mock.mockImplementation(() => {
        throw new Error("DB error");
      });

      const req = mockReq({ query: {} });
      const res = mockRes();

      await getTournaments(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 500);
    });
  });

  describe("getUserTournaments", () => {
    it("should return tournaments belonging to the current user", async () => {
      const tournaments = [{ name: "Mine", code: "ABCDEF" }];
      const chain = {
        sort: mock.fn(async () => tournaments),
      };
      mockTournamentFind.mock.mockImplementation(() => chain);

      const req = mockReq({
        user: { id: "user123", username: "user123", isGuest: false },
      });
      const res = mockRes();

      await getUserTournaments(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.deepStrictEqual(
        res.json.mock.calls[0].arguments[0].data,
        tournaments,
      );

      // The controller now builds a more complex query: { $or: [{ createdBy: "user123" }, { "participants.name": { $in: ["user123"] } }] }
      const actualQuery = mockTournamentFind.mock.calls[0].arguments[0];
      assert.ok(actualQuery.$or);
      assert.deepStrictEqual(actualQuery.$or[0], { createdBy: "user123" });
    });

    it("should return 500 on error", async () => {
      mockTournamentFind.mock.mockImplementation(() => {
        throw new Error("fail");
      });

      const req = mockReq();
      const res = mockRes();

      await getUserTournaments(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 500);
    });
  });

  describe("addParticipant", () => {
    function makePendingTournament(overrides = {}) {
      return {
        status: "pending",
        playerCount: 8,
        participants: [],
        save: mock.fn(async () => {}),
        ...overrides,
      };
    }

    it("should return 404 if tournament not found", async () => {
      mockTournamentFindOne.mock.mockImplementation(async () => null);
      const req = mockReq({ params: { id: "t1" }, body: { name: "Alice" } });
      const res = mockRes();
      await addParticipant(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 404);
    });

    it("should return 400 if tournament already started", async () => {
      mockTournamentFindOne.mock.mockImplementation(async () =>
        makePendingTournament({ status: "active" }),
      );
      const req = mockReq({ params: { id: "t1" }, body: { name: "Alice" } });
      const res = mockRes();
      await addParticipant(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it("should return 400 if tournament is full", async () => {
      const t = makePendingTournament({
        playerCount: 1,
        participants: [{ name: "Bob" }],
      });
      mockTournamentFindOne.mock.mockImplementation(async () => t);
      const req = mockReq({ params: { id: "t1" }, body: { name: "Alice" } });
      const res = mockRes();
      await addParticipant(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it("should add participant and return 200", async () => {
      const t = makePendingTournament();
      mockTournamentFindOne.mock.mockImplementation(async () => t);
      const req = mockReq({
        params: { id: "t1" },
        body: { name: "Alice", faction: "Empire" },
      });
      const res = mockRes();
      await addParticipant(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(t.participants.length, 1);
      assert.strictEqual(t.participants[0].name, "Alice");
      assert.strictEqual(t.save.mock.calls.length, 1);
    });
  });

  describe("removeParticipant", () => {
    it("should return 404 if tournament not found", async () => {
      mockTournamentFindOne.mock.mockImplementation(async () => null);
      const req = mockReq({ params: { id: "t1", participantId: "p1" } });
      const res = mockRes();
      await removeParticipant(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 404);
    });

    it("should return 404 if participant not in tournament", async () => {
      const t = {
        status: "pending",
        participants: [{ _id: { toString: () => "p2" }, name: "Bob" }],
        save: mock.fn(async () => {}),
      };
      mockTournamentFindOne.mock.mockImplementation(async () => t);
      const req = mockReq({ params: { id: "t1", participantId: "p1" } });
      const res = mockRes();
      await removeParticipant(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 404);
    });

    it("should remove participant and return 200", async () => {
      const t = {
        status: "pending",
        participants: [{ _id: { toString: () => "p1" }, name: "Alice" }],
        save: mock.fn(async () => {}),
      };
      mockTournamentFindOne.mock.mockImplementation(async () => t);
      const req = mockReq({ params: { id: "t1", participantId: "p1" } });
      const res = mockRes();
      await removeParticipant(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(t.participants.length, 0);
    });
  });

  describe("joinTournament", () => {
    it("should return 404 if tournament not found", async () => {
      mockTournamentFindById.mock.mockImplementation(async () => null);
      const req = mockReq({ params: { id: "t1" } });
      const res = mockRes();
      await joinTournament(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 404);
    });

    it("should return 400 if tournament is not pending", async () => {
      mockTournamentFindById.mock.mockImplementation(async () => ({
        status: "active",
        participants: [],
        playerCount: 8,
      }));
      const req = mockReq({ params: { id: "t1" } });
      const res = mockRes();
      await joinTournament(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it("should return 400 if already joined", async () => {
      mockTournamentFindById.mock.mockImplementation(async () => ({
        status: "pending",
        playerCount: 8,
        participants: [{ name: "tester" }],
        save: mock.fn(async () => {}),
      }));
      const req = mockReq({
        params: { id: "t1" },
        user: { id: "u1", username: "tester" },
      });
      const res = mockRes();
      await joinTournament(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it("should join tournament and return 200", async () => {
      const t = {
        status: "pending",
        playerCount: 8,
        participants: [],
        save: mock.fn(async () => {}),
      };
      mockTournamentFindById.mock.mockImplementation(async () => t);
      const req = mockReq({
        params: { id: "t1" },
        body: { faction: "Empire" },
        user: { id: "u1", username: "tester" },
      });
      const res = mockRes();
      await joinTournament(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(t.participants.length, 1);
      assert.strictEqual(t.participants[0].name, "tester");
    });

    it("should use Guest_XXXX name when no username", async () => {
      const t = {
        status: "pending",
        playerCount: 8,
        participants: [],
        save: mock.fn(async () => {}),
      };
      mockTournamentFindById.mock.mockImplementation(async () => t);
      const req = mockReq({
        params: { id: "t1" },
        body: {},
        user: { id: "abcdef123456", username: undefined },
      });
      const res = mockRes();
      await joinTournament(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.ok(t.participants[0].name.startsWith("Guest_"));
    });
  });

  describe("updateDescription", () => {
    it("should return 400 if description is not a string", async () => {
      const req = mockReq({ params: { id: "t1" }, body: { description: 123 } });
      const res = mockRes();
      await updateDescription(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it("should return 400 if description exceeds 2000 chars", async () => {
      const req = mockReq({
        params: { id: "t1" },
        body: { description: "x".repeat(2001) },
      });
      const res = mockRes();
      await updateDescription(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it("should return 404 if tournament not found", async () => {
      mockTournamentFindOne.mock.mockImplementation(async () => null);
      const req = mockReq({
        params: { id: "t1" },
        body: { description: "New desc" },
      });
      const res = mockRes();
      await updateDescription(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 404);
    });

    it("should update description and return 200", async () => {
      const t = { description: "old", save: mock.fn(async () => {}) };
      mockTournamentFindOne.mock.mockImplementation(async () => t);
      const req = mockReq({
        params: { id: "t1" },
        body: { description: "New desc" },
      });
      const res = mockRes();
      await updateDescription(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(t.description, "New desc");
      assert.strictEqual(t.save.mock.calls.length, 1);
    });
  });

  describe("deleteTournament", () => {
    it("should delete a pending tournament and return 200", async () => {
      const tournament = {
        status: "pending",
        deleteOne: mock.fn(async () => {}),
      };
      mockTournamentFindOne.mock.mockImplementation(async () => tournament);

      const req = mockReq({ params: { id: "t1" } });
      const res = mockRes();

      await deleteTournament(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(res.json.mock.calls[0].arguments[0].success, true);
      assert.strictEqual(tournament.deleteOne.mock.calls.length, 1);
    });

    it("should return 404 when tournament not found", async () => {
      mockTournamentFindOne.mock.mockImplementation(async () => null);

      const req = mockReq({ params: { id: "missing" } });
      const res = mockRes();

      await deleteTournament(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 404);
    });

    it("should return 400 when tournament is already started", async () => {
      const tournament = { status: "active", deleteOne: mock.fn() };
      mockTournamentFindOne.mock.mockImplementation(async () => tournament);

      const req = mockReq({ params: { id: "t1" } });
      const res = mockRes();

      await deleteTournament(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
      assert.strictEqual(tournament.deleteOne.mock.calls.length, 0);
    });

    it("should return 500 on unexpected error", async () => {
      mockTournamentFindOne.mock.mockImplementation(async () => {
        throw new Error("DB error");
      });

      const req = mockReq({ params: { id: "t1" } });
      const res = mockRes();

      await deleteTournament(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 500);
    });
  });
});
