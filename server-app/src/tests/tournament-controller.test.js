import assert from "node:assert";
import { describe, it, beforeEach, mock } from "node:test";

// ── Socket service mocks ──────────────────────────────────────────────────────
const mockEmitTournamentUpdated = mock.fn();
const mockEmitMatchesUpdated = mock.fn();
const mockEmitMatchesAppended = mock.fn();

mock.module("../infrastructure/socket/socket-service.js", {
  namedExports: {
    emitTournamentUpdated: mockEmitTournamentUpdated,
    emitMatchesUpdated: mockEmitMatchesUpdated,
    emitMatchesAppended: mockEmitMatchesAppended,
    emitMatchUpdated: mock.fn(),
  },
});

// ── Tournament service mocks (needed for startTournament / advanceRound) ──────
const mockSingleElimStart = mock.fn(() => []);
const mockSingleElimAdvance = mock.fn(() => ({ completed: false, docs: [] }));
const mockDoubleElimStart = mock.fn(() => []);
const mockDoubleElimAdvance = mock.fn(() => ({
  completed: false,
  docs: [],
  message: null,
}));
const mockRoundRobinStart = mock.fn(() => []);
const mockRoundRobinAdvance = mock.fn(() => ({ completed: true }));
const mockSwissStart = mock.fn(() => []);
const mockSwissAdvance = mock.fn(() => ({ docs: [] }));

mock.module("../domain/services/tournament-service.js", {
  namedExports: {
    singleElimStart: mockSingleElimStart,
    singleElimAdvance: mockSingleElimAdvance,
    doubleElimStart: mockDoubleElimStart,
    doubleElimAdvance: mockDoubleElimAdvance,
    roundRobinStart: mockRoundRobinStart,
    roundRobinAdvance: mockRoundRobinAdvance,
    swissStart: mockSwissStart,
    swissAdvance: mockSwissAdvance,
  },
});

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
const mockTournamentAggregate = mock.fn(async () => []);

mock.module("../domain/models/tournament.js", {
  namedExports: {},
  defaultExport: {
    create: mockTournamentCreate,
    find: mockTournamentFind,
    findOne: mockTournamentFindOne,
    findOneAndUpdate: mockTournamentFindOneAndUpdate,
    findById: mockTournamentFindById,
    findByIdAndUpdate: mockTournamentFindByIdAndUpdate,
    aggregate: mockTournamentAggregate,
  },
});

mock.module("../infrastructure/utils/logger.js", {
  defaultExport: {
    error: mock.fn(),
    info: mock.fn(),
    debug: mock.fn(),
  },
});

// ── Stats cache mock ──────────────────────────────────────────────────────────
const mockInvalidateStatsCache = mock.fn(async () => {});
mock.module("../infrastructure/services/stats-service.js", {
  namedExports: { invalidateStatsCache: mockInvalidateStatsCache },
});

const mockMatchInsertMany = mock.fn(async () => []);
const mockMatchFind = mock.fn(() => ({
  sort: mock.fn(async () => []),
}));

mock.module("../domain/models/match.js", {
  namedExports: {},
  defaultExport: {
    insertMany: mockMatchInsertMany,
    find: mockMatchFind,
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
  updateParticipant,
  joinTournament,
  updateDescription,
  deleteTournament,
  startTournament,
  advanceRound,
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
    mockTournamentAggregate.mock.resetCalls();
    mockTournamentInstance.deleteOne.mock.resetCalls();
    mockMatchInsertMany.mock.resetCalls();
    mockEmitTournamentUpdated.mock.resetCalls();
    mockEmitMatchesUpdated.mock.resetCalls();
    mockEmitMatchesAppended.mock.resetCalls();
    mockSingleElimStart.mock.resetCalls();
    mockSingleElimAdvance.mock.resetCalls();
    mockRoundRobinAdvance.mock.resetCalls();
    mockSwissAdvance.mock.resetCalls();
    mockDoubleElimAdvance.mock.resetCalls();
    mockInvalidateStatsCache.mock.resetCalls();
    mockInvalidateStatsCache.mock.mockImplementation(async () => {});
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
      const req = mockReq({ params: { id: "aaaaaaaaaaaaaaaaaaaaaaaa" } });
      const res = mockRes();
      await getTournamentById(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 404);
    });

    it("should return tournament with 200 if found", async () => {
      const tournament = {
        _id: "aaaaaaaaaaaaaaaaaaaaaaaa",
        name: "My T",
        code: "ABC123",
        save: mock.fn(async () => {}),
      };
      mockTournamentFindById.mock.mockImplementation(async () => tournament);
      mockTournamentFindByIdAndUpdate.mock.mockImplementation(
        async () => tournament,
      );
      const req = mockReq({ params: { id: "aaaaaaaaaaaaaaaaaaaaaaaa" } });
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
        sort: mock.fn(function () {
          return this;
        }),
        skip: mock.fn(function () {
          return this;
        }),
        limit: mock.fn(async () => tournaments),
      };
      mockTournamentFind.mock.mockImplementation(() => chain);
      mockTournamentAggregate.mock.mockImplementation(async () => []);

      const req = mockReq({
        user: { id: "user123", username: "user123", isGuest: false },
        query: { page: "1", limit: "9" },
      });
      const res = mockRes();

      await getUserTournaments(req, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.deepStrictEqual(
        res.json.mock.calls[0].arguments[0].data,
        tournaments,
      );

      const actualQuery = mockTournamentFind.mock.calls[0].arguments[0];
      assert.ok(actualQuery.$or);
      assert.deepStrictEqual(actualQuery.$or[0], { createdBy: "user123" });
    });

    it("should scope to wh3 when game=wh3", async () => {
      const tournaments = [{ name: "WH3 only", code: "GHIJKL" }];
      const chain = {
        sort: mock.fn(function () {
          return this;
        }),
        skip: mock.fn(function () {
          return this;
        }),
        limit: mock.fn(async () => tournaments),
      };
      mockTournamentFind.mock.mockImplementation(() => chain);
      mockTournamentAggregate.mock.mockImplementation(async () => []);

      const req = mockReq({
        user: { id: "user123", username: "user123", isGuest: false },
        query: { page: "1", limit: "9", game: "wh3" },
      });
      const res = mockRes();

      await getUserTournaments(req, res);

      const actualQuery = mockTournamentFind.mock.calls[0].arguments[0];
      assert.deepStrictEqual(actualQuery.enable40kFactions, { $ne: true });
    });

    it("should scope to 40k when game=40k", async () => {
      const tournaments = [{ name: "40k only", code: "MNOPQR" }];
      const chain = {
        sort: mock.fn(function () {
          return this;
        }),
        skip: mock.fn(function () {
          return this;
        }),
        limit: mock.fn(async () => tournaments),
      };
      mockTournamentFind.mock.mockImplementation(() => chain);
      mockTournamentAggregate.mock.mockImplementation(async () => []);

      const req = mockReq({
        user: { id: "user123", username: "user123", isGuest: false },
        query: { page: "1", limit: "9", game: "40k" },
      });
      const res = mockRes();

      await getUserTournaments(req, res);

      const actualQuery = mockTournamentFind.mock.calls[0].arguments[0];
      assert.strictEqual(actualQuery.enable40kFactions, true);
    });

    it("should not add an enable40kFactions filter when game is omitted", async () => {
      const tournaments = [{ name: "All", code: "STUVWX" }];
      const chain = {
        sort: mock.fn(function () {
          return this;
        }),
        skip: mock.fn(function () {
          return this;
        }),
        limit: mock.fn(async () => tournaments),
      };
      mockTournamentFind.mock.mockImplementation(() => chain);
      mockTournamentAggregate.mock.mockImplementation(async () => []);

      const req = mockReq({
        user: { id: "user123", username: "user123", isGuest: false },
        query: { page: "1", limit: "9" },
      });
      const res = mockRes();

      await getUserTournaments(req, res);

      const actualQuery = mockTournamentFind.mock.calls[0].arguments[0];
      assert.ok(!("enable40kFactions" in actualQuery));
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
        _id: { toString: () => "t1" },
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

    it("should default faction to an empty string when not provided", async () => {
      const t = makePendingTournament();
      mockTournamentFindOne.mock.mockImplementation(async () => t);
      const req = mockReq({
        params: { id: "t1" },
        body: { name: "Alice" },
      });
      const res = mockRes();
      await addParticipant(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(t.participants[0].faction, "");
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
        _id: { toString: () => "t1" },
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
        _id: { toString: () => "t1" },
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
        _id: { toString: () => "t1" },
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

    it("should store a null userId and use guest name-matching for already-joined check when isGuest", async () => {
      const t = {
        _id: { toString: () => "t1" },
        status: "pending",
        playerCount: 8,
        participants: [{ name: "Guest_abcdef" }],
        save: mock.fn(async () => {}),
      };
      mockTournamentFindById.mock.mockImplementation(async () => t);
      const req = mockReq({
        params: { id: "t1" },
        body: {},
        user: { id: "abcdef123456", username: undefined, isGuest: true },
      });
      const res = mockRes();
      await joinTournament(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it("should join as a guest and store a null userId on the participant", async () => {
      const t = {
        _id: { toString: () => "t1" },
        status: "pending",
        playerCount: 8,
        participants: [],
        save: mock.fn(async () => {}),
      };
      mockTournamentFindById.mock.mockImplementation(async () => t);
      const req = mockReq({
        params: { id: "t1" },
        body: {},
        user: { id: "abcdef123456", username: undefined, isGuest: true },
      });
      const res = mockRes();
      await joinTournament(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(t.participants[0].userId, null);
    });

    it("should detect already-joined via matching userId (non-guest)", async () => {
      const t = {
        _id: { toString: () => "t1" },
        status: "pending",
        playerCount: 8,
        participants: [{ userId: "u1", name: "Someone Else" }],
        save: mock.fn(async () => {}),
      };
      mockTournamentFindById.mock.mockImplementation(async () => t);
      const req = mockReq({
        params: { id: "t1" },
        body: {},
        user: { id: "u1", username: "tester", isGuest: false },
      });
      const res = mockRes();
      await joinTournament(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
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

  // ── startTournament ─────────────────────────────────────────────────────────

  describe("startTournament", () => {
    function makePendingTournament(overrides = {}) {
      return {
        _id: "t1",
        status: "pending",
        tournamentType: "Single Elimination",
        participants: [{ name: "Alice" }, { name: "Bob" }],
        save: mock.fn(async () => {}),
        ...overrides,
      };
    }

    it("should return 404 if tournament not found", async () => {
      mockTournamentFindOne.mock.mockImplementation(async () => null);
      const req = mockReq({ params: { id: "t1" } });
      const res = mockRes();
      await startTournament(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 404);
    });

    it("should return 400 if tournament is already active", async () => {
      mockTournamentFindOne.mock.mockImplementation(async () =>
        makePendingTournament({ status: "active" }),
      );
      const req = mockReq({ params: { id: "t1" } });
      const res = mockRes();
      await startTournament(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it("should return 400 if fewer than 2 participants", async () => {
      mockTournamentFindOne.mock.mockImplementation(async () =>
        makePendingTournament({ participants: [{ name: "Alice" }] }),
      );
      const req = mockReq({ params: { id: "t1" } });
      const res = mockRes();
      await startTournament(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it("should start tournament and return 200 with matches", async () => {
      const t = makePendingTournament();
      mockTournamentFindOne.mock.mockImplementation(async () => t);
      mockSingleElimStart.mock.mockImplementation(() => [{ round: 1 }]);
      mockMatchInsertMany.mock.mockImplementation(async (docs) => docs);
      const req = mockReq({ params: { id: "t1" } });
      const res = mockRes();
      await startTournament(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(t.status, "active");
    });

    it("should emit tournament:updated and matches:updated on success", async () => {
      const t = makePendingTournament();
      const newMatches = [{ _id: "m1", round: 1 }];
      mockTournamentFindOne.mock.mockImplementation(async () => t);
      mockSingleElimStart.mock.mockImplementation(() => []);
      mockMatchInsertMany.mock.mockImplementation(async () => newMatches);
      const req = mockReq({ params: { id: "t1" } });
      const res = mockRes();
      await startTournament(req, res);
      assert.strictEqual(mockEmitTournamentUpdated.mock.calls.length, 1);
      assert.strictEqual(
        mockEmitTournamentUpdated.mock.calls[0].arguments[0],
        "t1",
      );
      assert.strictEqual(mockEmitMatchesUpdated.mock.calls.length, 1);
      assert.deepStrictEqual(
        mockEmitMatchesUpdated.mock.calls[0].arguments[1],
        newMatches,
      );
    });

    it("should not emit when startTournament fails validation", async () => {
      mockTournamentFindOne.mock.mockImplementation(async () => null);
      const req = mockReq({ params: { id: "t1" } });
      const res = mockRes();
      await startTournament(req, res);
      assert.strictEqual(mockEmitTournamentUpdated.mock.calls.length, 0);
      assert.strictEqual(mockEmitMatchesUpdated.mock.calls.length, 0);
    });
  });

  // ── advanceRound ────────────────────────────────────────────────────────────

  describe("advanceRound", () => {
    function makeActiveTournament(overrides = {}) {
      return {
        _id: "t1",
        status: "active",
        tournamentType: "Single Elimination",
        participants: [{ name: "Alice" }, { name: "Bob" }],
        save: mock.fn(async () => {}),
        ...overrides,
      };
    }

    function makeCompletedMatches(round = 1) {
      return [
        {
          round,
          bracketSide: null,
          status: "completed",
          winnerId: "p1",
        },
      ];
    }

    it("should return 404 if tournament not found", async () => {
      mockTournamentFindOne.mock.mockImplementation(async () => null);
      const req = mockReq({ params: { id: "t1" } });
      const res = mockRes();
      await advanceRound(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 404);
    });

    it("should return 400 if no matches found", async () => {
      const t = makeActiveTournament();
      mockTournamentFindOne.mock.mockImplementation(async () => t);
      mockMatchFind.mock.mockImplementation(() => ({
        sort: mock.fn(async () => []),
      }));
      const req = mockReq({ params: { id: "t1" } });
      const res = mockRes();
      await advanceRound(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it("Single Elimination: emits tournament:updated and returns completed=true when done", async () => {
      const t = makeActiveTournament();
      mockTournamentFindOne.mock.mockImplementation(async () => t);
      mockMatchFind.mock.mockImplementation(() => ({
        sort: mock.fn(async () => makeCompletedMatches(1)),
      }));
      mockSingleElimAdvance.mock.mockImplementation(() => ({
        completed: true,
        docs: [],
      }));
      const req = mockReq({ params: { id: "t1" } });
      const res = mockRes();
      await advanceRound(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      const json = res.json.mock.calls[0].arguments[0];
      assert.strictEqual(json.completed, true);
      assert.strictEqual(mockEmitTournamentUpdated.mock.calls.length, 1);
      assert.strictEqual(mockEmitMatchesAppended.mock.calls.length, 0);
    });

    it("Single Elimination: swallows a rejected invalidateStatsCache call on completion", async () => {
      const t = makeActiveTournament();
      mockTournamentFindOne.mock.mockImplementation(async () => t);
      mockMatchFind.mock.mockImplementation(() => ({
        sort: mock.fn(async () => makeCompletedMatches(1)),
      }));
      mockSingleElimAdvance.mock.mockImplementation(() => ({
        completed: true,
        docs: [],
      }));
      mockInvalidateStatsCache.mock.mockImplementationOnce(async () => {
        throw new Error("cache down");
      });
      const req = mockReq({ params: { id: "t1" } });
      const res = mockRes();
      await advanceRound(req, res);
      await new Promise((resolve) => setImmediate(resolve));
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(t.status, "completed");
    });

    it("Single Elimination: emits matches:appended with new round when advancing", async () => {
      const t = makeActiveTournament();
      const newMatches = [{ _id: "m2", round: 2 }];
      mockTournamentFindOne.mock.mockImplementation(async () => t);
      mockMatchFind.mock.mockImplementation(() => ({
        sort: mock.fn(async () => makeCompletedMatches(1)),
      }));
      mockSingleElimAdvance.mock.mockImplementation(() => ({
        completed: false,
        docs: [{ round: 2 }],
      }));
      mockMatchInsertMany.mock.mockImplementation(async () => newMatches);
      const req = mockReq({ params: { id: "t1" } });
      const res = mockRes();
      await advanceRound(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(mockEmitMatchesAppended.mock.calls.length, 1);
      assert.deepStrictEqual(
        mockEmitMatchesAppended.mock.calls[0].arguments[1],
        newMatches,
      );
      assert.strictEqual(mockEmitTournamentUpdated.mock.calls.length, 0);
    });

    it("Round Robin: emits tournament:updated when completed", async () => {
      const t = makeActiveTournament({ tournamentType: "Round Robin" });
      mockTournamentFindOne.mock.mockImplementation(async () => t);
      mockMatchFind.mock.mockImplementation(() => ({
        sort: mock.fn(async () => makeCompletedMatches(1)),
      }));
      mockRoundRobinAdvance.mock.mockImplementation(() => ({
        completed: true,
      }));
      const req = mockReq({ params: { id: "t1" } });
      const res = mockRes();
      await advanceRound(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(mockEmitTournamentUpdated.mock.calls.length, 1);
      assert.strictEqual(t.status, "completed");
    });

    it("Round Robin: swallows a rejected invalidateStatsCache call on completion", async () => {
      const t = makeActiveTournament({ tournamentType: "Round Robin" });
      mockTournamentFindOne.mock.mockImplementation(async () => t);
      mockMatchFind.mock.mockImplementation(() => ({
        sort: mock.fn(async () => makeCompletedMatches(1)),
      }));
      mockRoundRobinAdvance.mock.mockImplementation(() => ({
        completed: true,
      }));
      mockInvalidateStatsCache.mock.mockImplementationOnce(async () => {
        throw new Error("cache down");
      });
      const req = mockReq({ params: { id: "t1" } });
      const res = mockRes();
      await advanceRound(req, res);
      await new Promise((resolve) => setImmediate(resolve));
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(t.status, "completed");
    });

    it("Round Robin: returns 400 when not all matches are completed", async () => {
      const t = makeActiveTournament({ tournamentType: "Round Robin" });
      mockTournamentFindOne.mock.mockImplementation(async () => t);
      mockMatchFind.mock.mockImplementation(() => ({
        sort: mock.fn(async () => [
          { round: 1, bracketSide: null, status: "pending" },
        ]),
      }));
      mockRoundRobinAdvance.mock.mockImplementation(() => ({
        completed: false,
        message: "1 match(es) still pending",
      }));
      const req = mockReq({ params: { id: "t1" } });
      const res = mockRes();
      await advanceRound(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it("Swiss System: returns 400 when current round has incomplete matches", async () => {
      const t = makeActiveTournament({
        tournamentType: "Swiss System",
        participants: [
          { name: "A" },
          { name: "B" },
          { name: "C" },
          { name: "D" },
        ],
      });
      mockTournamentFindOne.mock.mockImplementation(async () => t);
      mockMatchFind.mock.mockImplementation(() => ({
        sort: mock.fn(async () => [
          { round: 1, bracketSide: null, status: "completed" },
          { round: 1, bracketSide: null, status: "pending" },
        ]),
      }));
      const req = mockReq({ params: { id: "t1" } });
      const res = mockRes();
      await advanceRound(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it("Swiss System: completes tournament after max rounds", async () => {
      const t = makeActiveTournament({
        tournamentType: "Swiss System",
        participants: [{ name: "A" }, { name: "B" }],
        save: mock.fn(async () => {}),
      });
      // ceil(log2(2)) = 1, so after round 1 we're done
      mockTournamentFindOne.mock.mockImplementation(async () => t);
      mockMatchFind.mock.mockImplementation(() => ({
        sort: mock.fn(async () => [
          { round: 1, bracketSide: null, status: "completed" },
        ]),
      }));
      const req = mockReq({ params: { id: "t1" } });
      const res = mockRes();
      await advanceRound(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(res.json.mock.calls[0].arguments[0].completed, true);
      assert.strictEqual(t.status, "completed");
    });

    it("Swiss System: swallows a rejected invalidateStatsCache call on completion", async () => {
      const t = makeActiveTournament({
        tournamentType: "Swiss System",
        participants: [{ name: "A" }, { name: "B" }],
        save: mock.fn(async () => {}),
      });
      mockTournamentFindOne.mock.mockImplementation(async () => t);
      mockMatchFind.mock.mockImplementation(() => ({
        sort: mock.fn(async () => [
          { round: 1, bracketSide: null, status: "completed" },
        ]),
      }));
      mockInvalidateStatsCache.mock.mockImplementationOnce(async () => {
        throw new Error("cache down");
      });
      const req = mockReq({ params: { id: "t1" } });
      const res = mockRes();
      await advanceRound(req, res);
      await new Promise((resolve) => setImmediate(resolve));
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(t.status, "completed");
    });

    it("Swiss System: advances to next round when max rounds not reached", async () => {
      const t = makeActiveTournament({
        tournamentType: "Swiss System",
        participants: [
          { name: "A" },
          { name: "B" },
          { name: "C" },
          { name: "D" },
          { name: "E" },
          { name: "F" },
          { name: "G" },
          { name: "H" },
        ],
        save: mock.fn(async () => {}),
      });
      // ceil(log2(8)) = 3, so after round 1 we still advance
      const newMatches = [{ _id: "m2", round: 2 }];
      mockTournamentFindOne.mock.mockImplementation(async () => t);
      mockMatchFind.mock.mockImplementation(() => ({
        sort: mock.fn(async () => [
          { round: 1, bracketSide: null, status: "completed" },
        ]),
      }));
      mockSwissAdvance.mock.mockImplementation(() => ({
        docs: [{ round: 2 }],
      }));
      mockMatchInsertMany.mock.mockImplementation(async () => newMatches);
      const req = mockReq({ params: { id: "t1" } });
      const res = mockRes();
      await advanceRound(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(mockEmitMatchesAppended.mock.calls.length, 1);
    });

    it("Double Elimination: returns 400 when current matches are incomplete", async () => {
      const t = makeActiveTournament({ tournamentType: "Double Elimination" });
      mockTournamentFindOne.mock.mockImplementation(async () => t);
      mockMatchFind.mock.mockImplementation(() => ({
        sort: mock.fn(async () => [
          {
            round: 1,
            bracketSide: "winners",
            status: "pending",
            _id: "m1",
          },
        ]),
      }));
      const req = mockReq({ params: { id: "t1" } });
      const res = mockRes();
      await advanceRound(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it("Double Elimination: completes tournament when doubleElimAdvance returns completed", async () => {
      const t = makeActiveTournament({
        tournamentType: "Double Elimination",
        save: mock.fn(async () => {}),
      });
      mockTournamentFindOne.mock.mockImplementation(async () => t);
      mockMatchFind.mock.mockImplementation(() => ({
        sort: mock.fn(async () => [
          {
            round: 1,
            bracketSide: "winners",
            status: "completed",
            _id: "m1",
          },
        ]),
      }));
      mockDoubleElimAdvance.mock.mockImplementation(() => ({
        completed: true,
        docs: [],
      }));
      const req = mockReq({ params: { id: "t1" } });
      const res = mockRes();
      await advanceRound(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(res.json.mock.calls[0].arguments[0].completed, true);
      assert.strictEqual(t.status, "completed");
    });

    it("Double Elimination: swallows a rejected invalidateStatsCache call on completion", async () => {
      const t = makeActiveTournament({
        tournamentType: "Double Elimination",
        save: mock.fn(async () => {}),
      });
      mockTournamentFindOne.mock.mockImplementation(async () => t);
      mockMatchFind.mock.mockImplementation(() => ({
        sort: mock.fn(async () => [
          {
            round: 1,
            bracketSide: "winners",
            status: "completed",
            _id: "m1",
          },
        ]),
      }));
      mockDoubleElimAdvance.mock.mockImplementation(() => ({
        completed: true,
        docs: [],
      }));
      mockInvalidateStatsCache.mock.mockImplementationOnce(async () => {
        throw new Error("cache down");
      });
      const req = mockReq({ params: { id: "t1" } });
      const res = mockRes();
      await advanceRound(req, res);
      await new Promise((resolve) => setImmediate(resolve));
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(t.status, "completed");
    });

    it("Double Elimination: returns 400 when doubleElimAdvance returns a message with no docs", async () => {
      const t = makeActiveTournament({ tournamentType: "Double Elimination" });
      mockTournamentFindOne.mock.mockImplementation(async () => t);
      mockMatchFind.mock.mockImplementation(() => ({
        sort: mock.fn(async () => [
          { round: 1, bracketSide: "winners", status: "completed" },
        ]),
      }));
      mockDoubleElimAdvance.mock.mockImplementation(() => ({
        completed: false,
        message: "Grand final not yet completed",
        docs: [],
      }));
      const req = mockReq({ params: { id: "t1" } });
      const res = mockRes();
      await advanceRound(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it("Double Elimination: appends new matches when advancing", async () => {
      const t = makeActiveTournament({ tournamentType: "Double Elimination" });
      const newMatches = [{ _id: "m2", round: 2 }];
      mockTournamentFindOne.mock.mockImplementation(async () => t);
      mockMatchFind.mock.mockImplementation(() => ({
        sort: mock.fn(async () => [
          { round: 1, bracketSide: "winners", status: "completed" },
        ]),
      }));
      mockDoubleElimAdvance.mock.mockImplementation(() => ({
        completed: false,
        message: null,
        docs: [{ round: 2 }],
      }));
      mockMatchInsertMany.mock.mockImplementation(async () => newMatches);
      const req = mockReq({ params: { id: "t1" } });
      const res = mockRes();
      await advanceRound(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(mockEmitMatchesAppended.mock.calls.length, 1);
    });

    it("Double Elimination: handles an empty winners bracket and a populated grand final", async () => {
      const t = makeActiveTournament({ tournamentType: "Double Elimination" });
      mockTournamentFindOne.mock.mockImplementation(async () => t);
      mockMatchFind.mock.mockImplementation(() => ({
        sort: mock.fn(async () => [
          { round: 1, bracketSide: "losers", status: "completed" },
          { round: 1, bracketSide: "grand_final", status: "completed" },
        ]),
      }));
      mockDoubleElimAdvance.mock.mockImplementation(() => ({
        completed: true,
        docs: [],
      }));
      const req = mockReq({ params: { id: "t1" } });
      const res = mockRes();
      await advanceRound(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(res.json.mock.calls[0].arguments[0].completed, true);
    });

    it("Single Elimination: returns 400 when current round has incomplete matches", async () => {
      const t = makeActiveTournament();
      mockTournamentFindOne.mock.mockImplementation(async () => t);
      mockMatchFind.mock.mockImplementation(() => ({
        sort: mock.fn(async () => [
          { round: 1, bracketSide: "winners", status: "pending" },
          { round: 1, bracketSide: "winners", status: "completed" },
        ]),
      }));
      const req = mockReq({ params: { id: "t1" } });
      const res = mockRes();
      await advanceRound(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it("returns 400 if tournament is not active", async () => {
      const t = makeActiveTournament({ status: "completed" });
      mockTournamentFindOne.mock.mockImplementation(async () => t);
      const req = mockReq({ params: { id: "t1" } });
      const res = mockRes();
      await advanceRound(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it("returns 500 on unexpected error", async () => {
      mockTournamentFindOne.mock.mockImplementation(async () => {
        throw new Error("db error");
      });
      const req = mockReq({ params: { id: "t1" } });
      const res = mockRes();
      await advanceRound(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 500);
    });
  });

  // ── updateParticipant ────────────────────────────────────────────────────────

  describe("updateParticipant", () => {
    function makeTournamentWithParticipant(overrides = {}) {
      const participant = {
        _id: "p1",
        name: "Alice",
        faction: "Empire",
      };
      return {
        _id: { toString: () => "t1" },
        save: mock.fn(async () => {}),
        participants: {
          id: mock.fn(() => participant),
        },
        ...overrides,
      };
    }

    it("should return 404 if tournament not found", async () => {
      mockTournamentFindOne.mock.mockImplementation(async () => null);
      const req = mockReq({
        params: { id: "t1", participantId: "p1" },
        body: { name: "Bob" },
      });
      const res = mockRes();
      await updateParticipant(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 404);
    });

    it("should return 404 if participant not found", async () => {
      const t = {
        _id: { toString: () => "t1" },
        save: mock.fn(async () => {}),
        participants: { id: mock.fn(() => null) },
      };
      mockTournamentFindOne.mock.mockImplementation(async () => t);
      const req = mockReq({
        params: { id: "t1", participantId: "p1" },
        body: { name: "Bob" },
      });
      const res = mockRes();
      await updateParticipant(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 404);
    });

    it("should update participant name and return 200", async () => {
      const t = makeTournamentWithParticipant();
      mockTournamentFindOne.mock.mockImplementation(async () => t);
      const req = mockReq({
        params: { id: "t1", participantId: "p1" },
        body: { name: "Bob" },
      });
      const res = mockRes();
      await updateParticipant(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(t.save.mock.calls.length, 1);
    });

    it("should update participant faction and return 200", async () => {
      const t = makeTournamentWithParticipant();
      mockTournamentFindOne.mock.mockImplementation(async () => t);
      const req = mockReq({
        params: { id: "t1", participantId: "p1" },
        body: { faction: "Skaven" },
      });
      const res = mockRes();
      await updateParticipant(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
    });

    it("should return 500 on unexpected error", async () => {
      mockTournamentFindOne.mock.mockImplementation(async () => {
        throw new Error("db error");
      });
      const req = mockReq({
        params: { id: "t1", participantId: "p1" },
        body: { name: "Bob" },
      });
      const res = mockRes();
      await updateParticipant(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 500);
    });
  });

  // ── createTournament extra paths ─────────────────────────────────────────────

  describe("createTournament - extra paths", () => {
    it("should return 403 if user is a guest", async () => {
      const req = mockReq({
        body: {
          name: "t",
          playerCount: 4,
          tournamentType: "Single Elimination",
        },
        user: { id: "u1", isGuest: true },
      });
      const res = mockRes();
      await createTournament(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 403);
    });

    it("should return 400 if description exceeds 2000 chars", async () => {
      const req = mockReq({
        body: {
          name: "t",
          description: "x".repeat(2001),
          playerCount: 4,
          tournamentType: "Single Elimination",
        },
        user: { id: "u1", isGuest: false },
      });
      const res = mockRes();
      await createTournament(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });
  });

  // ── getTournaments extra paths ───────────────────────────────────────────────

  describe("getTournaments - extra paths", () => {
    it("should filter by multiple statuses when comma-separated", async () => {
      const tournaments = [{ name: "t1" }];
      mockTournamentFind.mock.mockImplementation(() => ({
        populate: mock.fn(() => ({
          sort: mock.fn(async () => tournaments),
        })),
      }));
      const req = mockReq({ query: { status: "active,pending" } });
      const res = mockRes();
      await getTournaments(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      const filter = mockTournamentFind.mock.calls[0].arguments[0];
      assert.ok(filter.status.$in);
    });

    it("should return 500 on unexpected error", async () => {
      mockTournamentFind.mock.mockImplementation(() => {
        throw new Error("db error");
      });
      const req = mockReq();
      const res = mockRes();
      await getTournaments(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 500);
    });
  });

  // ── getTournamentById extra paths ────────────────────────────────────────────

  describe("getTournamentById - extra paths", () => {
    it("should return 404 if tournament not found", async () => {
      mockTournamentFindById.mock.mockImplementation(async () => null);
      const req = mockReq({ params: { id: "aaaaaaaaaaaaaaaaaaaaaaaa" } });
      const res = mockRes();
      await getTournamentById(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 404);
    });

    it("should return 500 on unexpected error", async () => {
      mockTournamentFindById.mock.mockImplementation(async () => {
        throw new Error("db error");
      });
      const req = mockReq({ params: { id: "aaaaaaaaaaaaaaaaaaaaaaaa" } });
      const res = mockRes();
      await getTournamentById(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 500);
    });
  });

  // ── getTournamentByCode extra paths ──────────────────────────────────────────

  describe("getTournamentByCode - extra paths", () => {
    it("should return 200 with tournament when found", async () => {
      const tournament = { code: "ABC123", name: "My Tournament" };
      mockTournamentFindOne.mock.mockImplementation(async () => tournament);
      const req = mockReq({ params: { code: "abc123" } });
      const res = mockRes();
      await getTournamentByCode(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
    });

    it("should return 404 if tournament not found by code", async () => {
      mockTournamentFindOne.mock.mockImplementation(async () => null);
      const req = mockReq({ params: { code: "NOTFOUND" } });
      const res = mockRes();
      await getTournamentByCode(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 404);
    });

    it("should return 500 on unexpected error", async () => {
      mockTournamentFindOne.mock.mockImplementation(async () => {
        throw new Error("db error");
      });
      const req = mockReq({ params: { code: "ABC" } });
      const res = mockRes();
      await getTournamentByCode(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 500);
    });
  });

  // ── startTournament extra tournament types ────────────────────────────────────

  describe("startTournament - extra tournament types", () => {
    function makePendingTournament(overrides = {}) {
      return {
        _id: "t1",
        status: "pending",
        tournamentType: "Single Elimination",
        participants: [{ name: "Alice" }, { name: "Bob" }],
        save: mock.fn(async () => {}),
        ...overrides,
      };
    }

    it("should start Double Elimination tournament", async () => {
      const t = makePendingTournament({ tournamentType: "Double Elimination" });
      mockTournamentFindOne.mock.mockImplementation(async () => t);
      mockDoubleElimStart.mock.mockImplementation(() => [{ round: 1 }]);
      mockMatchInsertMany.mock.mockImplementation(async (docs) => docs);
      const req = mockReq({ params: { id: "t1" } });
      const res = mockRes();
      await startTournament(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(mockDoubleElimStart.mock.calls.length, 1);
    });

    it("should start Round Robin tournament", async () => {
      const t = makePendingTournament({ tournamentType: "Round Robin" });
      mockTournamentFindOne.mock.mockImplementation(async () => t);
      mockRoundRobinStart.mock.mockImplementation(() => [{ round: 1 }]);
      mockMatchInsertMany.mock.mockImplementation(async (docs) => docs);
      const req = mockReq({ params: { id: "t1" } });
      const res = mockRes();
      await startTournament(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(mockRoundRobinStart.mock.calls.length, 1);
    });

    it("should start Swiss System tournament", async () => {
      const t = makePendingTournament({ tournamentType: "Swiss System" });
      mockTournamentFindOne.mock.mockImplementation(async () => t);
      mockSwissStart.mock.mockImplementation(() => [{ round: 1 }]);
      mockMatchInsertMany.mock.mockImplementation(async (docs) => docs);
      const req = mockReq({ params: { id: "t1" } });
      const res = mockRes();
      await startTournament(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(mockSwissStart.mock.calls.length, 1);
    });

    it("should default to Single Elimination for unknown tournament type", async () => {
      const t = makePendingTournament({ tournamentType: "Unknown Type" });
      mockTournamentFindOne.mock.mockImplementation(async () => t);
      mockSingleElimStart.mock.mockImplementation(() => []);
      mockMatchInsertMany.mock.mockImplementation(async () => []);
      const req = mockReq({ params: { id: "t1" } });
      const res = mockRes();
      await startTournament(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(mockSingleElimStart.mock.calls.length, 1);
    });

    it("should return 500 on unexpected error", async () => {
      mockTournamentFindOne.mock.mockImplementation(async () => {
        throw new Error("db error");
      });
      const req = mockReq({ params: { id: "t1" } });
      const res = mockRes();
      await startTournament(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 500);
    });
  });

  // ── addParticipant extra paths ────────────────────────────────────────────────

  describe("addParticipant - extra paths", () => {
    it("should return 500 on unexpected error", async () => {
      mockTournamentFindOne.mock.mockImplementation(async () => {
        throw new Error("db error");
      });
      const req = mockReq({ params: { id: "t1" }, body: { name: "Alice" } });
      const res = mockRes();
      await addParticipant(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 500);
    });
  });

  // ── removeParticipant extra paths ─────────────────────────────────────────────

  describe("removeParticipant - extra paths", () => {
    it("should return 400 if tournament is already started", async () => {
      const t = {
        status: "active",
        participants: [{ _id: { toString: () => "p1" }, name: "Alice" }],
        save: mock.fn(async () => {}),
      };
      mockTournamentFindOne.mock.mockImplementation(async () => t);
      const req = mockReq({ params: { id: "t1", participantId: "p1" } });
      const res = mockRes();
      await removeParticipant(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it("should return 500 on unexpected error", async () => {
      mockTournamentFindOne.mock.mockImplementation(async () => {
        throw new Error("db error");
      });
      const req = mockReq({ params: { id: "t1", participantId: "p1" } });
      const res = mockRes();
      await removeParticipant(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 500);
    });
  });

  // ── joinTournament extra paths ────────────────────────────────────────────────

  describe("joinTournament - extra paths", () => {
    it("should return 400 if tournament is full", async () => {
      mockTournamentFindById.mock.mockImplementation(async () => ({
        status: "pending",
        playerCount: 2,
        participants: [{ name: "Alice" }, { name: "Bob" }],
        save: mock.fn(async () => {}),
      }));
      const req = mockReq({
        params: { id: "t1" },
        user: { id: "u1", username: "Carol" },
      });
      const res = mockRes();
      await joinTournament(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it("should return 500 on unexpected error", async () => {
      mockTournamentFindById.mock.mockImplementation(async () => {
        throw new Error("db error");
      });
      const req = mockReq({ params: { id: "t1" } });
      const res = mockRes();
      await joinTournament(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 500);
    });
  });

  // ── updateDescription error path ─────────────────────────────────────────────

  describe("updateDescription - error path", () => {
    it("should return 500 on unexpected error", async () => {
      mockTournamentFindOne.mock.mockImplementation(async () => {
        throw new Error("db error");
      });
      const req = mockReq({
        params: { id: "t1" },
        body: { description: "valid desc" },
      });
      const res = mockRes();
      await updateDescription(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 500);
    });
  });

  // ── ensureCode (via getTournamentById) ────────────────────────────────────────

  describe("ensureCode - via getTournamentById", () => {
    it("should assign a code when tournament has none", async () => {
      const codelessTournament = {
        _id: "aaaaaaaaaaaaaaaaaaaaaaaa",
        name: "no code",
        code: null,
      };
      const withCode = { ...codelessTournament, code: "ABC123" };
      // findById returns tournament without code
      mockTournamentFindById.mock.mockImplementation(
        async () => codelessTournament,
      );
      // findOneAndUpdate (ensureCode) returns tournament with code
      mockTournamentFindOneAndUpdate.mock.mockImplementation(
        async () => withCode,
      );
      const req = mockReq({ params: { id: "aaaaaaaaaaaaaaaaaaaaaaaa" } });
      const res = mockRes();
      await getTournamentById(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(
        res.json.mock.calls[0].arguments[0].data.code,
        "ABC123",
      );
    });

    it("should re-fetch when findOneAndUpdate returns null (race condition)", async () => {
      const codelessTournament = {
        _id: "aaaaaaaaaaaaaaaaaaaaaaaa",
        name: "no code",
        code: "",
      };
      const withCode = { ...codelessTournament, code: "XYZ999" };
      let findByIdCallCount = 0;
      mockTournamentFindById.mock.mockImplementation(async () => {
        findByIdCallCount++;
        return findByIdCallCount === 1 ? codelessTournament : withCode;
      });
      // findOneAndUpdate returns null (another request won the race)
      mockTournamentFindOneAndUpdate.mock.mockImplementation(async () => null);
      const req = mockReq({ params: { id: "aaaaaaaaaaaaaaaaaaaaaaaa" } });
      const res = mockRes();
      await getTournamentById(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      // Second findById call gets the code that another request set
      assert.strictEqual(
        res.json.mock.calls[0].arguments[0].data.code,
        "XYZ999",
      );
    });

    it("should fall back to the original tournament when the re-fetch also finds nothing", async () => {
      const codelessTournament = {
        _id: "aaaaaaaaaaaaaaaaaaaaaaaa",
        name: "no code",
        code: "",
      };
      let findByIdCallCount = 0;
      mockTournamentFindById.mock.mockImplementation(async () => {
        findByIdCallCount++;
        return findByIdCallCount === 1 ? codelessTournament : null;
      });
      mockTournamentFindOneAndUpdate.mock.mockImplementation(async () => null);
      const req = mockReq({ params: { id: "aaaaaaaaaaaaaaaaaaaaaaaa" } });
      const res = mockRes();
      await getTournamentById(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(
        res.json.mock.calls[0].arguments[0].data,
        codelessTournament,
      );
    });
  });

  // ── getUserTournaments extra paths ────────────────────────────────────────────

  describe("getUserTournaments - extra paths", () => {
    it("should filter by status when provided", async () => {
      const tournaments = [{ name: "t1", code: "ABC" }];
      mockTournamentFind.mock.mockImplementation(() => ({
        sort: mock.fn(() => ({
          skip: mock.fn(() => ({
            limit: mock.fn(async () => tournaments),
          })),
        })),
      }));
      mockTournamentAggregate.mock.mockImplementation(async () => [
        { _id: "active", count: 1 },
      ]);
      const req = mockReq({
        user: { id: "u1", username: "user1", isGuest: false },
        query: { status: "active", page: "1", limit: "9" },
      });
      const res = mockRes();
      await getUserTournaments(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      const filter = mockTournamentFind.mock.calls[0].arguments[0];
      assert.strictEqual(filter.status, "active");
    });

    it("should work for guest users (no createdBy clause)", async () => {
      const tournaments = [];
      mockTournamentFind.mock.mockImplementation(() => ({
        sort: mock.fn(() => ({
          skip: mock.fn(() => ({
            limit: mock.fn(async () => tournaments),
          })),
        })),
      }));
      mockTournamentAggregate.mock.mockImplementation(async () => []);
      const req = mockReq({
        user: { id: "g1", username: "guest1", isGuest: true },
        query: {},
      });
      const res = mockRes();
      await getUserTournaments(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      const filter = mockTournamentFind.mock.calls[0].arguments[0];
      // Guest: no createdBy in $or
      const hasCreatedByClause = filter.$or.some((c) => c.createdBy);
      assert.strictEqual(hasCreatedByClause, false);
    });
  });

  // ─── branch coverage for previously-uncovered early returns ──────────────────

  describe("getTournamentById — invalid ID branch", () => {
    it("returns 400 for a non-ObjectId tournament ID", async () => {
      const req = mockReq({ params: { id: "not-a-valid-objectid" } });
      const res = mockRes();
      await getTournamentById(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
      assert.match(
        res.json.mock.calls[0].arguments[0].message,
        /invalid tournament id/i,
      );
    });
  });

  describe("getUserTournaments — valid ObjectId userId branch", () => {
    it("adds a participants.userId condition when userId is a valid ObjectId", async () => {
      const validHexId = "aaaaaaaaaaaaaaaaaaaaaaaa";
      mockTournamentFind.mock.mockImplementation(() => ({
        sort: mock.fn(() => ({
          skip: mock.fn(() => ({
            limit: mock.fn(async () => []),
          })),
        })),
      }));
      mockTournamentAggregate.mock.mockImplementation(async () => []);
      const req = mockReq({
        user: { id: validHexId, username: "player1", isGuest: false },
        query: {},
      });
      const res = mockRes();
      await getUserTournaments(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      const filter = mockTournamentFind.mock.calls[0].arguments[0];
      // isValidObjectId(validHexId) is true → participants.userId clause added
      const hasParticipantClause = filter.$or.some(
        (c) => c["participants.userId"] !== undefined,
      );
      assert.strictEqual(hasParticipantClause, true);
    });
  });

  describe("updateParticipant — name and faction validation", () => {
    function makeTournamentWithParticipant() {
      const participant = { _id: "p1", name: "Alice", faction: "Empire" };
      return {
        _id: { toString: () => "t1" },
        save: mock.fn(async () => {}),
        participants: { id: mock.fn(() => participant) },
      };
    }

    it("returns 400 when name is an empty string", async () => {
      const t = makeTournamentWithParticipant();
      mockTournamentFindOne.mock.mockImplementation(async () => t);
      const req = mockReq({
        params: { id: "t1", participantId: "p1" },
        body: { name: "   " },
      });
      const res = mockRes();
      await updateParticipant(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
      assert.match(
        res.json.mock.calls[0].arguments[0].message,
        /1 and 100 characters/i,
      );
    });

    it("returns 400 when name exceeds 100 characters", async () => {
      const t = makeTournamentWithParticipant();
      mockTournamentFindOne.mock.mockImplementation(async () => t);
      const req = mockReq({
        params: { id: "t1", participantId: "p1" },
        body: { name: "a".repeat(101) },
      });
      const res = mockRes();
      await updateParticipant(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it("returns 400 when faction exceeds 100 characters", async () => {
      const t = makeTournamentWithParticipant();
      mockTournamentFindOne.mock.mockImplementation(async () => t);
      const req = mockReq({
        params: { id: "t1", participantId: "p1" },
        body: { faction: "f".repeat(101) },
      });
      const res = mockRes();
      await updateParticipant(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
      assert.match(res.json.mock.calls[0].arguments[0].message, /at most 100/i);
    });
  });
});
