import assert from "node:assert";
import { describe, it, beforeEach, mock } from "node:test";

const mockMatchFind = mock.fn();
const mockMatchFindById = mock.fn();
const mockMatchCreate = mock.fn();

mock.module("../domain/models/match.js", {
  defaultExport: {
    find: mockMatchFind,
    findById: mockMatchFindById,
    create: mockMatchCreate,
  },
});

const mockTournamentFindOne = mock.fn();
mock.module("../domain/models/tournament.js", {
  defaultExport: {
    findOne: mockTournamentFindOne,
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

// ── Stats cache mock ──────────────────────────────────────────────────────────
const mockInvalidateStatsCache = mock.fn(async () => {});
mock.module("../infrastructure/services/stats-service.js", {
  namedExports: { invalidateStatsCache: mockInvalidateStatsCache },
});

// ── Socket service mocks ──────────────────────────────────────────────────────
const mockEmitMatchUpdated = mock.fn();
mock.module("../infrastructure/socket/socket-service.js", {
  namedExports: {
    emitMatchUpdated: mockEmitMatchUpdated,
    emitTournamentUpdated: mock.fn(),
    emitMatchesUpdated: mock.fn(),
    emitMatchesAppended: mock.fn(),
  },
});

const {
  getMatchesByTournament,
  getMatchById,
  createMatch,
  reportResult,
  resolveDispute,
  recordResult,
  overrideResult,
  updateMatchStatus,
} = await import("../interfaces/http/controllers/match-controller.js");

function mockRes() {
  const res = {};
  res.status = mock.fn(() => res);
  res.json = mock.fn(() => res);
  return res;
}

function mockReq(overrides = {}) {
  return {
    params: {},
    body: {},
    user: { id: "u1" },
    ...overrides,
  };
}

describe("match-controller", () => {
  beforeEach(() => {
    mockMatchFind.mock.resetCalls();
    mockMatchFindById.mock.resetCalls();
    mockMatchCreate.mock.resetCalls();
    mockTournamentFindOne.mock.resetCalls();
    mockEmitMatchUpdated.mock.resetCalls();
    mockInvalidateStatsCache.mock.resetCalls();
  });

  describe("getMatchesByTournament", () => {
    it("should return matches for a tournament", async () => {
      const matches = [{ id: "m1" }];
      mockMatchFind.mock.mockImplementation(() => ({
        sort: mock.fn(async () => matches),
      }));
      const req = mockReq({
        params: { tournamentId: "aaaaaaaaaaaaaaaaaaaaaaaa" },
      });
      const res = mockRes();
      await getMatchesByTournament(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.deepStrictEqual(res.json.mock.calls[0].arguments[0].data, matches);
    });
  });

  describe("getMatchById", () => {
    it("should return 404 if match not found", async () => {
      mockMatchFindById.mock.mockImplementation(async () => null);
      const req = mockReq({ params: { id: "aaaaaaaaaaaaaaaaaaaaaaaa" } });
      const res = mockRes();
      await getMatchById(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 404);
    });

    it("should return match if found", async () => {
      const match = { id: "aaaaaaaaaaaaaaaaaaaaaaaa" };
      mockMatchFindById.mock.mockImplementation(async () => match);
      const req = mockReq({ params: { id: "aaaaaaaaaaaaaaaaaaaaaaaa" } });
      const res = mockRes();
      await getMatchById(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.deepStrictEqual(res.json.mock.calls[0].arguments[0].data, match);
    });
  });

  describe("createMatch", () => {
    const validTournamentId = "aaaaaaaaaaaaaaaaaaaaaaaa";

    it("should return 400 for invalid tournament ID", async () => {
      const req = mockReq({ body: { tournamentId: "invalid" } });
      const res = mockRes();
      await createMatch(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it("should return 404 if tournament not found", async () => {
      mockTournamentFindOne.mock.mockImplementation(async () => null);
      const req = mockReq({ body: { tournamentId: validTournamentId } });
      const res = mockRes();
      await createMatch(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 404);
    });

    it("should create match and return 201", async () => {
      mockTournamentFindOne.mock.mockImplementation(async () => ({
        status: "active",
      }));
      mockMatchCreate.mock.mockImplementation(async (data) => data);
      const req = mockReq({
        body: {
          tournamentId: validTournamentId,
          round: 1,
          matchNumber: 1,
          player1: { name: "p1" },
          player2: { name: "p2" },
        },
      });
      const res = mockRes();
      await createMatch(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 201);
      assert.strictEqual(mockMatchCreate.mock.calls.length, 1);
    });
  });

  // ─── reportResult ─────────────────────────────────────────────────────────

  describe("reportResult", () => {
    function makeMatch(overrides = {}) {
      const p1Id = "aaaaaaaaaaaaaaaaaaaaaaaa";
      const p2Id = "bbbbbbbbbbbbbbbbbbbbbbbb";
      return {
        status: "pending",
        reportedResults: [],
        player1: { participantId: p1Id, name: "Alice", faction: "" },
        player2: { participantId: p2Id, name: "Bob", faction: "" },
        tournament: {
          _id: {
            toString: () => "tttttttttttttttttttttttt",
          },
          status: "active",
          createdBy: "cccccccccccccccccccccccc",
        },
        save: mock.fn(async () => {}),
        ...overrides,
      };
    }

    it("should return 404 if match not found", async () => {
      mockMatchFindById.mock.mockImplementation(() => ({
        populate: async () => null,
      }));
      const req = mockReq({ params: { id: "m1" }, body: { winnerId: "aaa" } });
      const res = mockRes();
      await reportResult(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 404);
    });

    it("should return 400 if match already completed", async () => {
      const match = makeMatch({ status: "completed" });
      mockMatchFindById.mock.mockImplementation(() => ({
        populate: async () => match,
      }));
      const req = mockReq({
        params: { id: "m1" },
        body: { winnerId: match.player1.participantId },
      });
      const res = mockRes();
      await reportResult(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it("should return 400 if winnerId is not a player in the match", async () => {
      const match = makeMatch();
      mockMatchFindById.mock.mockImplementation(() => ({
        populate: async () => match,
      }));
      const req = mockReq({
        params: { id: "m1" },
        body: { winnerId: "dddddddddddddddddddddddd" },
        user: {
          id: "aaaaaaaaaaaaaaaaaaaaaaaa",
          username: "Alice",
          isGuest: false,
        },
      });
      const res = mockRes();
      await reportResult(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it("should return 403 if user is not a player or creator", async () => {
      const match = makeMatch();
      mockMatchFindById.mock.mockImplementation(() => ({
        populate: async () => match,
      }));
      const req = mockReq({
        params: { id: "m1" },
        body: { winnerId: match.player1.participantId },
        user: {
          id: "eeeeeeeeeeeeeeeeeeeeeeee",
          username: "Stranger",
          isGuest: false,
        },
      });
      const res = mockRes();
      await reportResult(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 403);
    });

    it("should accept report by matching player name (case-insensitive)", async () => {
      const match = makeMatch();
      mockMatchFindById.mock.mockImplementation(() => ({
        populate: async () => match,
      }));
      const req = mockReq({
        params: { id: "m1" },
        body: { winnerId: match.player1.participantId },
        user: {
          id: "eeeeeeeeeeeeeeeeeeeeeeee",
          username: "alice",
          isGuest: false,
        },
      });
      const res = mockRes();
      await reportResult(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(match.status, "in_progress");
    });

    it("should accept report by guest using Guest_XXXX fallback name", async () => {
      const guestId = "abcdef12-1234-1234-1234-123456789abc";
      const match = makeMatch({
        player1: {
          participantId: "aaaaaaaaaaaaaaaaaaaaaaaa",
          name: `Guest_abcdef`,
          faction: "",
        },
        player2: {
          participantId: "bbbbbbbbbbbbbbbbbbbbbbbb",
          name: "Bob",
          faction: "",
        },
      });
      mockMatchFindById.mock.mockImplementation(() => ({
        populate: async () => match,
      }));
      const req = mockReq({
        params: { id: "m1" },
        body: { winnerId: match.player1.participantId },
        user: { id: guestId, username: undefined, isGuest: true },
      });
      const res = mockRes();
      await reportResult(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
    });

    it("should set status to in_progress after first report", async () => {
      const match = makeMatch();
      mockMatchFindById.mock.mockImplementation(() => ({
        populate: async () => match,
      }));
      const req = mockReq({
        params: { id: "m1" },
        body: { winnerId: match.player1.participantId },
        user: { id: "x", username: "Alice", isGuest: false },
      });
      const res = mockRes();
      await reportResult(req, res);
      assert.strictEqual(match.status, "in_progress");
      assert.strictEqual(mockEmitMatchUpdated.mock.calls.length, 1);
    });

    it("should set status to completed when both players agree", async () => {
      const p1Id = "aaaaaaaaaaaaaaaaaaaaaaaa";
      const p2Id = "bbbbbbbbbbbbbbbbbbbbbbbb";
      const match = makeMatch({
        reportedResults: [
          {
            reportedBy: p2Id,
            reportedByName: "Bob",
            winnerId: p1Id,
            reportedAt: new Date(),
          },
        ],
      });
      mockMatchFindById.mock.mockImplementation(() => ({
        populate: async () => match,
      }));
      const req = mockReq({
        params: { id: "m1" },
        body: { winnerId: p1Id },
        user: { id: "x", username: "Alice", isGuest: false },
      });
      const res = mockRes();
      await reportResult(req, res);
      assert.strictEqual(match.status, "completed");
      assert.strictEqual(match.winnerId, p1Id);
      assert.strictEqual(mockEmitMatchUpdated.mock.calls.length, 1);
      assert.strictEqual(mockInvalidateStatsCache.mock.calls.length, 1);
    });

    it("swallows a rejected invalidateStatsCache call on consensus completion", async () => {
      const p1Id = "aaaaaaaaaaaaaaaaaaaaaaaa";
      const p2Id = "bbbbbbbbbbbbbbbbbbbbbbbb";
      const match = makeMatch({
        reportedResults: [
          {
            reportedBy: p2Id,
            reportedByName: "Bob",
            winnerId: p1Id,
            reportedAt: new Date(),
          },
        ],
      });
      mockMatchFindById.mock.mockImplementation(() => ({
        populate: async () => match,
      }));
      mockInvalidateStatsCache.mock.mockImplementationOnce(async () => {
        throw new Error("cache down");
      });
      const req = mockReq({
        params: { id: "m1" },
        body: { winnerId: p1Id },
        user: { id: "x", username: "Alice", isGuest: false },
      });
      const res = mockRes();
      await reportResult(req, res);
      await new Promise((resolve) => setImmediate(resolve));
      assert.strictEqual(match.status, "completed");
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
    });

    it("should set status to disputed when players disagree", async () => {
      const p1Id = "aaaaaaaaaaaaaaaaaaaaaaaa";
      const p2Id = "bbbbbbbbbbbbbbbbbbbbbbbb";
      const match = makeMatch({
        reportedResults: [
          {
            reportedBy: p2Id,
            reportedByName: "Bob",
            winnerId: p2Id,
            reportedAt: new Date(),
          },
        ],
      });
      mockMatchFindById.mock.mockImplementation(() => ({
        populate: async () => match,
      }));
      const req = mockReq({
        params: { id: "m1" },
        body: { winnerId: p1Id },
        user: { id: "x", username: "Alice", isGuest: false },
      });
      const res = mockRes();
      await reportResult(req, res);
      assert.strictEqual(match.status, "disputed");
      assert.strictEqual(mockEmitMatchUpdated.mock.calls.length, 1);
      assert.strictEqual(mockInvalidateStatsCache.mock.calls.length, 0);
    });
  });

  // ─── resolveDispute ────────────────────────────────────────────────────────

  describe("resolveDispute", () => {
    function makeDisputedMatch(creatorId = "cccccccccccccccccccccccc") {
      const p1Id = "aaaaaaaaaaaaaaaaaaaaaaaa";
      const p2Id = "bbbbbbbbbbbbbbbbbbbbbbbb";
      return {
        status: "disputed",
        resultOverrides: [],
        reportedResults: [
          { reportedBy: p1Id, reportedByName: "Alice", winnerId: p1Id },
          { reportedBy: p2Id, reportedByName: "Bob", winnerId: p2Id },
        ],
        player1: { participantId: p1Id, name: "Alice", faction: "" },
        player2: { participantId: p2Id, name: "Bob", faction: "" },
        tournament: {
          _id: {
            toString: () => "tttttttttttttttttttttttt",
          },
          status: "active",
          createdBy: creatorId,
        },
        winnerId: null,
        save: mock.fn(async () => {}),
      };
    }

    it("should return 404 if match not found", async () => {
      mockMatchFindById.mock.mockImplementation(() => ({
        populate: async () => null,
      }));
      const req = mockReq({ params: { id: "m1" }, body: { winnerId: "aaa" } });
      const res = mockRes();
      await resolveDispute(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 404);
    });

    it("should return 400 if match is not disputed", async () => {
      const match = makeDisputedMatch();
      match.status = "in_progress";
      mockMatchFindById.mock.mockImplementation(() => ({
        populate: async () => match,
      }));
      const req = mockReq({
        params: { id: "m1" },
        body: { winnerId: "aaa" },
        user: { id: "cccccccccccccccccccccccc" },
      });
      const res = mockRes();
      await resolveDispute(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it("should return 403 if user is not the creator", async () => {
      const match = makeDisputedMatch("cccccccccccccccccccccccc");
      mockMatchFindById.mock.mockImplementation(() => ({
        populate: async () => match,
      }));
      const req = mockReq({
        params: { id: "m1" },
        body: { winnerId: match.player1.participantId },
        user: { id: "eeeeeeeeeeeeeeeeeeeeeeee" },
      });
      const res = mockRes();
      await resolveDispute(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 403);
    });

    it("should resolve dispute and mark completed when creator picks winner", async () => {
      const creatorId = "cccccccccccccccccccccccc";
      const match = makeDisputedMatch(creatorId);
      const p1Id = match.player1.participantId;
      mockMatchFindById.mock.mockImplementation(() => ({
        populate: async () => match,
      }));
      const req = mockReq({
        params: { id: "m1" },
        body: { winnerId: p1Id, reason: "I saw it" },
        user: { id: creatorId },
      });
      const res = mockRes();
      await resolveDispute(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(match.status, "completed");
      assert.strictEqual(match.winnerId, p1Id);
      assert.strictEqual(match.resultOverrides.length, 1);
      assert.strictEqual(mockEmitMatchUpdated.mock.calls.length, 1);
      assert.strictEqual(mockInvalidateStatsCache.mock.calls.length, 1);
    });

    it("swallows a rejected invalidateStatsCache call on dispute resolution", async () => {
      const creatorId = "cccccccccccccccccccccccc";
      const match = makeDisputedMatch(creatorId);
      const p1Id = match.player1.participantId;
      mockMatchFindById.mock.mockImplementation(() => ({
        populate: async () => match,
      }));
      mockInvalidateStatsCache.mock.mockImplementationOnce(async () => {
        throw new Error("cache down");
      });
      const req = mockReq({
        params: { id: "m1" },
        body: { winnerId: p1Id, reason: "I saw it" },
        user: { id: creatorId },
      });
      const res = mockRes();
      await resolveDispute(req, res);
      await new Promise((resolve) => setImmediate(resolve));
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(match.status, "completed");
    });
  });

  // ─── overrideResult ────────────────────────────────────────────────────────

  describe("overrideResult", () => {
    function makeCompletedMatch(creatorId = "cccccccccccccccccccccccc") {
      const p1Id = "aaaaaaaaaaaaaaaaaaaaaaaa";
      const p2Id = "bbbbbbbbbbbbbbbbbbbbbbbb";
      return {
        status: "completed",
        resultOverrides: [],
        player1: { participantId: p1Id, name: "Alice", faction: "" },
        player2: { participantId: p2Id, name: "Bob", faction: "" },
        tournament: {
          _id: {
            toString: () => "tttttttttttttttttttttttt",
          },
          status: "active",
          createdBy: creatorId,
        },
        winnerId: p1Id,
        completedAt: new Date(),
        save: mock.fn(async () => {}),
      };
    }

    it("should return 404 if match not found", async () => {
      mockMatchFindById.mock.mockImplementation(() => ({
        populate: async () => null,
      }));
      const req = mockReq({ params: { id: "m1" }, body: { winnerId: "aaa" } });
      const res = mockRes();
      await overrideResult(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 404);
    });

    it("should return 403 if user is not the tournament admin", async () => {
      const match = makeCompletedMatch("cccccccccccccccccccccccc");
      mockMatchFindById.mock.mockImplementation(() => ({
        populate: async () => match,
      }));
      const req = mockReq({
        params: { id: "m1" },
        body: { winnerId: match.player2.participantId },
        user: { id: "eeeeeeeeeeeeeeeeeeeeeeee" },
      });
      const res = mockRes();
      await overrideResult(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 403);
    });

    it("should override result and return 200", async () => {
      const creatorId = "cccccccccccccccccccccccc";
      const match = makeCompletedMatch(creatorId);
      const p2Id = match.player2.participantId;
      mockMatchFindById.mock.mockImplementation(() => ({
        populate: async () => match,
      }));
      const req = mockReq({
        params: { id: "m1" },
        body: { winnerId: p2Id, reason: "Correcting error" },
        user: { id: creatorId },
      });
      const res = mockRes();
      await overrideResult(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(match.winnerId, p2Id);
      assert.strictEqual(match.resultOverrides.length, 1);
      assert.strictEqual(match.resultOverrides[0].reason, "Correcting error");
      assert.strictEqual(mockEmitMatchUpdated.mock.calls.length, 1);
      assert.strictEqual(mockInvalidateStatsCache.mock.calls.length, 1);
    });

    it("swallows a rejected invalidateStatsCache call on override", async () => {
      const creatorId = "cccccccccccccccccccccccc";
      const match = makeCompletedMatch(creatorId);
      const p2Id = match.player2.participantId;
      mockMatchFindById.mock.mockImplementation(() => ({
        populate: async () => match,
      }));
      mockInvalidateStatsCache.mock.mockImplementationOnce(async () => {
        throw new Error("cache down");
      });
      const req = mockReq({
        params: { id: "m1" },
        body: { winnerId: p2Id, reason: "Correcting error" },
        user: { id: creatorId },
      });
      const res = mockRes();
      await overrideResult(req, res);
      await new Promise((resolve) => setImmediate(resolve));
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(match.winnerId, p2Id);
    });

    it("should return 400 if winnerId is not a player in the match", async () => {
      const creatorId = "cccccccccccccccccccccccc";
      const match = makeCompletedMatch(creatorId);
      mockMatchFindById.mock.mockImplementation(() => ({
        populate: async () => match,
      }));
      const req = mockReq({
        params: { id: "m1" },
        body: { winnerId: "dddddddddddddddddddddddd" },
        user: { id: creatorId },
      });
      const res = mockRes();
      await overrideResult(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it("should override result on a pending match before voting starts", async () => {
      const creatorId = "cccccccccccccccccccccccc";
      const match = makeCompletedMatch(creatorId);
      match.status = "pending";
      match.winnerId = null;
      match.completedAt = undefined;
      const p1Id = match.player1.participantId;
      mockMatchFindById.mock.mockImplementation(() => ({
        populate: async () => match,
      }));
      const req = mockReq({
        params: { id: "m1" },
        body: { winnerId: p1Id, reason: "Admin decision" },
        user: { id: creatorId },
      });
      const res = mockRes();
      await overrideResult(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(match.status, "completed");
      assert.strictEqual(match.winnerId, p1Id);
      assert.strictEqual(match.resultOverrides.length, 1);
    });

    it("should override result on an in_progress match during voting", async () => {
      const creatorId = "cccccccccccccccccccccccc";
      const match = makeCompletedMatch(creatorId);
      match.status = "in_progress";
      match.winnerId = null;
      const p2Id = match.player2.participantId;
      mockMatchFindById.mock.mockImplementation(() => ({
        populate: async () => match,
      }));
      const req = mockReq({
        params: { id: "m1" },
        body: { winnerId: p2Id, reason: "Override during play" },
        user: { id: creatorId },
      });
      const res = mockRes();
      await overrideResult(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(match.status, "completed");
      assert.strictEqual(match.winnerId, p2Id);
      assert.strictEqual(match.resultOverrides.length, 1);
    });
  });

  // ─── recordResult ──────────────────────────────────────────────────────────

  describe("recordResult", () => {
    function makeActiveMatch(overrides = {}) {
      const p1Id = "aaaaaaaaaaaaaaaaaaaaaaaa";
      const p2Id = "bbbbbbbbbbbbbbbbbbbbbbbb";
      return {
        status: "in_progress",
        player1: { participantId: p1Id, name: "Alice", faction: "" },
        player2: { participantId: p2Id, name: "Bob", faction: "" },
        tournament: {
          _id: { toString: () => "tttttttttttttttttttttttt" },
          status: "active",
          createdBy: "u1",
        },
        save: mock.fn(async () => {}),
        ...overrides,
      };
    }

    it("should return 404 if match not found", async () => {
      mockMatchFindById.mock.mockImplementation(() => ({
        populate: async () => null,
      }));
      const req = mockReq({ params: { id: "m1" }, body: { winnerId: "aaa" } });
      const res = mockRes();
      await recordResult(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 404);
    });

    it("should return 403 if user is not the tournament admin", async () => {
      const match = makeActiveMatch({
        tournament: {
          _id: { toString: () => "tttttttttttttttttttttttt" },
          status: "active",
          createdBy: "someone-else",
        },
      });
      mockMatchFindById.mock.mockImplementation(() => ({
        populate: async () => match,
      }));
      const req = mockReq({
        params: { id: "m1" },
        body: { winnerId: match.player1.participantId },
      });
      const res = mockRes();
      await recordResult(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 403);
    });

    it("should return 400 if match is already completed", async () => {
      const match = makeActiveMatch({ status: "completed" });
      mockMatchFindById.mock.mockImplementation(() => ({
        populate: async () => match,
      }));
      const req = mockReq({
        params: { id: "m1" },
        body: { winnerId: match.player1.participantId },
      });
      const res = mockRes();
      await recordResult(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it("should return 400 if match is disputed", async () => {
      const match = makeActiveMatch({ status: "disputed" });
      mockMatchFindById.mock.mockImplementation(() => ({
        populate: async () => match,
      }));
      const req = mockReq({
        params: { id: "m1" },
        body: { winnerId: match.player1.participantId },
      });
      const res = mockRes();
      await recordResult(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it("should return 400 if tournament is not active", async () => {
      const match = makeActiveMatch({
        tournament: {
          _id: { toString: () => "tttttttttttttttttttttttt" },
          status: "pending",
          createdBy: "u1",
        },
      });
      mockMatchFindById.mock.mockImplementation(() => ({
        populate: async () => match,
      }));
      const req = mockReq({
        params: { id: "m1" },
        body: { winnerId: match.player1.participantId },
      });
      const res = mockRes();
      await recordResult(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it("should return 400 if winnerId is not a player", async () => {
      const match = makeActiveMatch();
      mockMatchFindById.mock.mockImplementation(() => ({
        populate: async () => match,
      }));
      const req = mockReq({
        params: { id: "m1" },
        body: { winnerId: "dddddddddddddddddddddddd" },
      });
      const res = mockRes();
      await recordResult(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it("should record result, mark completed, and emit", async () => {
      const match = makeActiveMatch();
      const p1Id = match.player1.participantId;
      mockMatchFindById.mock.mockImplementation(() => ({
        populate: async () => match,
      }));
      const req = mockReq({
        params: { id: "m1" },
        body: { winnerId: p1Id },
      });
      const res = mockRes();
      await recordResult(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(match.status, "completed");
      assert.strictEqual(match.winnerId, p1Id);
      assert.strictEqual(mockEmitMatchUpdated.mock.calls.length, 1);
      assert.strictEqual(mockInvalidateStatsCache.mock.calls.length, 1);
    });

    it("swallows a rejected invalidateStatsCache call on record result", async () => {
      const match = makeActiveMatch();
      const p1Id = match.player1.participantId;
      mockMatchFindById.mock.mockImplementation(() => ({
        populate: async () => match,
      }));
      mockInvalidateStatsCache.mock.mockImplementationOnce(async () => {
        throw new Error("cache down");
      });
      const req = mockReq({
        params: { id: "m1" },
        body: { winnerId: p1Id },
      });
      const res = mockRes();
      await recordResult(req, res);
      await new Promise((resolve) => setImmediate(resolve));
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(match.status, "completed");
    });
  });

  // ─── updateMatchStatus ─────────────────────────────────────────────────────

  describe("500-error paths", () => {
    it("getMatchesByTournament returns 500 on DB error", async () => {
      mockMatchFind.mock.mockImplementation(() => ({
        sort: mock.fn(async () => {
          throw new Error("DB error");
        }),
      }));
      const req = mockReq({
        params: { tournamentId: "aaaaaaaaaaaaaaaaaaaaaaaa" },
      });
      const res = mockRes();
      await getMatchesByTournament(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 500);
    });

    it("getMatchById returns 500 on DB error", async () => {
      mockMatchFindById.mock.mockImplementation(async () => {
        throw new Error("DB error");
      });
      const req = mockReq({ params: { id: "aaaaaaaaaaaaaaaaaaaaaaaa" } });
      const res = mockRes();
      await getMatchById(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 500);
    });

    it("createMatch returns 500 on DB error", async () => {
      mockTournamentFindOne.mock.mockImplementation(async () => {
        throw new Error("DB error");
      });
      const req = mockReq({
        body: { tournamentId: "aaaaaaaaaaaaaaaaaaaaaaaa" },
      });
      const res = mockRes();
      await createMatch(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 500);
    });

    it("reportResult returns 500 on DB error", async () => {
      mockMatchFindById.mock.mockImplementation(() => ({
        populate: async () => {
          throw new Error("DB error");
        },
      }));
      const req = mockReq({ params: { id: "m1" }, body: { winnerId: "aaa" } });
      const res = mockRes();
      await reportResult(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 500);
    });

    it("resolveDispute returns 500 on DB error", async () => {
      mockMatchFindById.mock.mockImplementation(() => ({
        populate: async () => {
          throw new Error("DB error");
        },
      }));
      const req = mockReq({ params: { id: "m1" }, body: { winnerId: "aaa" } });
      const res = mockRes();
      await resolveDispute(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 500);
    });

    it("recordResult returns 500 on DB error", async () => {
      mockMatchFindById.mock.mockImplementation(() => ({
        populate: async () => {
          throw new Error("DB error");
        },
      }));
      const req = mockReq({ params: { id: "m1" }, body: { winnerId: "aaa" } });
      const res = mockRes();
      await recordResult(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 500);
    });

    it("overrideResult returns 500 on DB error", async () => {
      mockMatchFindById.mock.mockImplementation(() => ({
        populate: async () => {
          throw new Error("DB error");
        },
      }));
      const req = mockReq({ params: { id: "m1" }, body: { winnerId: "aaa" } });
      const res = mockRes();
      await overrideResult(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 500);
    });

    it("updateMatchStatus returns 500 on DB error", async () => {
      mockMatchFindById.mock.mockImplementation(() => ({
        populate: async () => {
          throw new Error("DB error");
        },
      }));
      const req = mockReq({
        params: { id: "m1" },
        body: { status: "in_progress" },
      });
      const res = mockRes();
      await updateMatchStatus(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 500);
    });
  });

  describe("updateMatchStatus", () => {
    function makeMatchForStatusUpdate(creatorId = "cccccccccccccccccccccccc") {
      return {
        status: "pending",
        player1: { participantId: "aaaaaaaaaaaaaaaaaaaaaaaa", name: "Alice" },
        player2: { participantId: "bbbbbbbbbbbbbbbbbbbbbbbb", name: "Bob" },
        tournament: {
          _id: { toString: () => "tttttttttttttttttttttttt" },
          status: "active",
          createdBy: creatorId,
        },
        save: mock.fn(async () => {}),
      };
    }

    it("should return 404 if match not found", async () => {
      mockMatchFindById.mock.mockImplementation(() => ({
        populate: async () => null,
      }));
      const req = mockReq({
        params: { id: "m1" },
        body: { status: "in_progress" },
      });
      const res = mockRes();
      await updateMatchStatus(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 404);
    });

    it("should return 403 if user is not the tournament admin", async () => {
      const match = makeMatchForStatusUpdate("cccccccccccccccccccccccc");
      mockMatchFindById.mock.mockImplementation(() => ({
        populate: async () => match,
      }));
      const req = mockReq({
        params: { id: "m1" },
        body: { status: "in_progress" },
        user: { id: "eeeeeeeeeeeeeeeeeeeeeeee" },
      });
      const res = mockRes();
      await updateMatchStatus(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 403);
    });

    it("should return 400 for an invalid status value", async () => {
      const creatorId = "cccccccccccccccccccccccc";
      const match = makeMatchForStatusUpdate(creatorId);
      mockMatchFindById.mock.mockImplementation(() => ({
        populate: async () => match,
      }));
      const req = mockReq({
        params: { id: "m1" },
        body: { status: "completed" },
        user: { id: creatorId },
      });
      const res = mockRes();
      await updateMatchStatus(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it("should update status and emit when admin sets in_progress", async () => {
      const creatorId = "cccccccccccccccccccccccc";
      const match = makeMatchForStatusUpdate(creatorId);
      mockMatchFindById.mock.mockImplementation(() => ({
        populate: async () => match,
      }));
      const req = mockReq({
        params: { id: "m1" },
        body: { status: "in_progress" },
        user: { id: creatorId },
      });
      const res = mockRes();
      await updateMatchStatus(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(match.status, "in_progress");
      assert.strictEqual(mockEmitMatchUpdated.mock.calls.length, 1);
    });

    it("should update status and emit when admin resets to pending", async () => {
      const creatorId = "cccccccccccccccccccccccc";
      const match = makeMatchForStatusUpdate(creatorId);
      match.status = "in_progress";
      mockMatchFindById.mock.mockImplementation(() => ({
        populate: async () => match,
      }));
      const req = mockReq({
        params: { id: "m1" },
        body: { status: "pending" },
        user: { id: creatorId },
      });
      const res = mockRes();
      await updateMatchStatus(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(match.status, "pending");
      assert.strictEqual(mockEmitMatchUpdated.mock.calls.length, 1);
    });
  });

  // ─── branch coverage for previously-uncovered early returns ──────────────────

  describe("getMatchesByTournament — invalid ID branch", () => {
    it("returns 400 for an invalid tournament ID", async () => {
      const req = mockReq({ params: { tournamentId: "not-a-valid-id" } });
      const res = mockRes();
      await getMatchesByTournament(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
      assert.match(
        res.json.mock.calls[0].arguments[0].message,
        /invalid tournament id/i,
      );
    });
  });

  describe("getMatchById — invalid ID branch", () => {
    it("returns 400 for an invalid match ID", async () => {
      const req = mockReq({ params: { id: "not-a-valid-id" } });
      const res = mockRes();
      await getMatchById(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
      assert.match(
        res.json.mock.calls[0].arguments[0].message,
        /invalid match id/i,
      );
    });
  });

  describe("createMatch — pending tournament branch", () => {
    it("returns 400 when the tournament has not been started yet", async () => {
      mockTournamentFindOne.mock.mockImplementation(async () => ({
        status: "pending",
      }));
      const req = mockReq({
        body: {
          tournamentId: "aaaaaaaaaaaaaaaaaaaaaaaa",
          round: 1,
          matchNumber: 1,
        },
      });
      const res = mockRes();
      await createMatch(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
      assert.match(
        res.json.mock.calls[0].arguments[0].message,
        /must be started/i,
      );
    });
  });

  describe("reportResult — extra branches", () => {
    it("returns 400 when the tournament is not active", async () => {
      const p1Id = "aaaaaaaaaaaaaaaaaaaaaaaa";
      const match = {
        status: "pending",
        reportedResults: [],
        player1: { participantId: p1Id, name: "Alice", faction: "" },
        player2: {
          participantId: "bbbbbbbbbbbbbbbbbbbbbbbb",
          name: "Bob",
          faction: "",
        },
        tournament: {
          _id: { toString: () => "tttttttttttttttttttttttt" },
          status: "pending",
          createdBy: "cccccccccccccccccccccccc",
        },
        save: mock.fn(async () => {}),
      };
      mockMatchFindById.mock.mockImplementation(() => ({
        populate: async () => match,
      }));
      const req = mockReq({
        params: { id: "m1" },
        body: { winnerId: p1Id },
      });
      const res = mockRes();
      await reportResult(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
      assert.match(res.json.mock.calls[0].arguments[0].message, /not active/i);
    });

    it("covers isPlayer2 branch of reporterParticipantId ternary", async () => {
      const p1Id = "aaaaaaaaaaaaaaaaaaaaaaaa";
      const p2Id = "bbbbbbbbbbbbbbbbbbbbbbbb";
      const match = {
        status: "pending",
        reportedResults: [],
        player1: { participantId: p1Id, name: "Alice", faction: "" },
        player2: { participantId: p2Id, name: "Bob", faction: "" },
        tournament: {
          _id: { toString: () => "tttttttttttttttttttttttt" },
          status: "active",
          createdBy: "cccccccccccccccccccccccc",
          participants: [],
        },
        save: mock.fn(async () => {}),
      };
      mockMatchFindById.mock.mockImplementation(() => ({
        populate: async () => match,
      }));
      // User is Bob (player2 by name) — isPlayer1=false, isPlayer2=true
      const req = mockReq({
        params: { id: "m1" },
        body: { winnerId: p2Id },
        user: { id: "user-bob", username: "Bob", isGuest: false },
      });
      const res = mockRes();
      await reportResult(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.ok(match.reportedResults.length > 0, "result should be recorded");
      // reporterParticipantId took the isPlayer2 branch → reportedBy === p2Id
      assert.strictEqual(match.reportedResults[0].reportedBy?.toString(), p2Id);
    });
  });

  describe("resolveDispute — winner not a match player", () => {
    it("returns 400 when winnerId is neither player1 nor player2", async () => {
      const creatorId = "cccccccccccccccccccccccc";
      const match = {
        status: "disputed",
        resultOverrides: [],
        player1: {
          participantId: "aaaaaaaaaaaaaaaaaaaaaaaa",
          name: "Alice",
        },
        player2: {
          participantId: "bbbbbbbbbbbbbbbbbbbbbbbb",
          name: "Bob",
        },
        tournament: { status: "active", createdBy: creatorId },
        winnerId: "aaaaaaaaaaaaaaaaaaaaaaaa",
        save: mock.fn(async () => {}),
      };
      mockMatchFindById.mock.mockImplementation(() => ({
        populate: async () => match,
      }));
      const req = mockReq({
        params: { id: "m1" },
        body: { winnerId: "dddddddddddddddddddddddd" },
        user: { id: creatorId },
      });
      const res = mockRes();
      await resolveDispute(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
      assert.match(
        res.json.mock.calls[0].arguments[0].message,
        /must be one of/i,
      );
    });
  });

  describe("reportResult — participant subdoc id match", () => {
    it("identifies the reporter via userParticipantSubId matching player1", async () => {
      const p1Id = "aaaaaaaaaaaaaaaaaaaaaaaa";
      const p2Id = "bbbbbbbbbbbbbbbbbbbbbbbb";
      const subId = "111111111111111111111111";
      const match = {
        status: "pending",
        reportedResults: [],
        player1: { participantId: p1Id, name: "Alice", faction: "" },
        player2: { participantId: p2Id, name: "Bob", faction: "" },
        tournament: {
          _id: { toString: () => "tttttttttttttttttttttttt" },
          status: "active",
          createdBy: "cccccccccccccccccccccccc",
          participants: [{ userId: "user-alice", _id: subId }],
        },
        save: mock.fn(async () => {}),
      };
      mockMatchFindById.mock.mockImplementation(() => ({
        populate: async () => match,
      }));
      const req = mockReq({
        params: { id: "m1" },
        body: { winnerId: p1Id },
        user: { id: "user-alice", username: "Alice", isGuest: false },
      });
      const res = mockRes();
      await reportResult(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(match.reportedResults[0].reportedBy, p1Id);
    });

    it("identifies the reporter via userParticipantSubId matching player2", async () => {
      const p1Id = "aaaaaaaaaaaaaaaaaaaaaaaa";
      const p2Id = "bbbbbbbbbbbbbbbbbbbbbbbb";
      const subId = "222222222222222222222222";
      const match = {
        status: "pending",
        reportedResults: [],
        player1: { participantId: p1Id, name: "Alice", faction: "" },
        player2: { participantId: p2Id, name: "Bob", faction: "" },
        tournament: {
          _id: { toString: () => "tttttttttttttttttttttttt" },
          status: "active",
          createdBy: "cccccccccccccccccccccccc",
          participants: [{ userId: "user-bob", _id: subId }],
        },
        save: mock.fn(async () => {}),
      };
      mockMatchFindById.mock.mockImplementation(() => ({
        populate: async () => match,
      }));
      const req = mockReq({
        params: { id: "m1" },
        body: { winnerId: p2Id },
        user: { id: "user-bob", username: "Bob", isGuest: false },
      });
      const res = mockRes();
      await reportResult(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(match.reportedResults[0].reportedBy, p2Id);
    });

    it("allows the tournament creator (non-player) to report, falling back to userId", async () => {
      const p1Id = "aaaaaaaaaaaaaaaaaaaaaaaa";
      const p2Id = "bbbbbbbbbbbbbbbbbbbbbbbb";
      const creatorId = "cccccccccccccccccccccccc";
      const match = {
        status: "pending",
        reportedResults: [],
        player1: { participantId: p1Id, name: "Alice", faction: "" },
        player2: { participantId: p2Id, name: "Bob", faction: "" },
        tournament: {
          _id: { toString: () => "tttttttttttttttttttttttt" },
          status: "active",
          createdBy: creatorId,
          participants: [],
        },
        save: mock.fn(async () => {}),
      };
      mockMatchFindById.mock.mockImplementation(() => ({
        populate: async () => match,
      }));
      const req = mockReq({
        params: { id: "m1" },
        body: { winnerId: p1Id },
        user: { id: creatorId, username: "Creator", isGuest: false },
      });
      const res = mockRes();
      await reportResult(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(match.reportedResults[0].reportedBy, creatorId);
    });
  });

  describe("reportResult — consensus loserId ternary (player2 wins)", () => {
    it("sets loserId to player1 when the consensus winner is player2", async () => {
      const p1Id = "aaaaaaaaaaaaaaaaaaaaaaaa";
      const p2Id = "bbbbbbbbbbbbbbbbbbbbbbbb";
      const match = {
        status: "in_progress",
        reportedResults: [
          { reportedBy: p1Id, reportedByName: "Alice", winnerId: p2Id },
        ],
        player1: { participantId: p1Id, name: "Alice", faction: "" },
        player2: { participantId: p2Id, name: "Bob", faction: "" },
        tournament: {
          _id: { toString: () => "tttttttttttttttttttttttt" },
          status: "active",
          createdBy: "cccccccccccccccccccccccc",
          participants: [],
        },
        save: mock.fn(async () => {}),
      };
      mockMatchFindById.mock.mockImplementation(() => ({
        populate: async () => match,
      }));
      const req = mockReq({
        params: { id: "m1" },
        body: { winnerId: p2Id },
        user: { id: "x", username: "Bob", isGuest: false },
      });
      const res = mockRes();
      await reportResult(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(match.status, "completed");
      assert.strictEqual(match.winnerId, p2Id);
      assert.strictEqual(match.loserId, p1Id);
    });
  });

  describe("resolveDispute — loserId ternary and default reason", () => {
    it("sets loserId to player1 when player2 wins, and uses default reason text", async () => {
      const creatorId = "cccccccccccccccccccccccc";
      const match = makeDisputedMatch(creatorId);
      const p1Id = match.player1.participantId;
      const p2Id = match.player2.participantId;
      mockMatchFindById.mock.mockImplementation(() => ({
        populate: async () => match,
      }));
      const req = mockReq({
        params: { id: "m1" },
        body: { winnerId: p2Id },
        user: { id: creatorId },
      });
      const res = mockRes();
      await resolveDispute(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(match.winnerId, p2Id);
      assert.strictEqual(match.loserId, p1Id);
      assert.strictEqual(
        match.resultOverrides[0].reason,
        "Dispute resolved by creator",
      );
    });

    function makeDisputedMatch(creatorId) {
      const p1Id = "aaaaaaaaaaaaaaaaaaaaaaaa";
      const p2Id = "bbbbbbbbbbbbbbbbbbbbbbbb";
      return {
        status: "disputed",
        resultOverrides: [],
        reportedResults: [
          { reportedBy: p1Id, reportedByName: "Alice", winnerId: p1Id },
          { reportedBy: p2Id, reportedByName: "Bob", winnerId: p2Id },
        ],
        player1: { participantId: p1Id, name: "Alice", faction: "" },
        player2: { participantId: p2Id, name: "Bob", faction: "" },
        tournament: {
          _id: { toString: () => "tttttttttttttttttttttttt" },
          status: "active",
          createdBy: creatorId,
        },
        winnerId: null,
        save: mock.fn(async () => {}),
      };
    }
  });

  describe("recordResult — loserId ternary (player2 wins)", () => {
    it("sets loserId to player1 when player2 is recorded as the winner", async () => {
      const p1Id = "aaaaaaaaaaaaaaaaaaaaaaaa";
      const p2Id = "bbbbbbbbbbbbbbbbbbbbbbbb";
      const match = {
        status: "in_progress",
        player1: { participantId: p1Id, name: "Alice", faction: "" },
        player2: { participantId: p2Id, name: "Bob", faction: "" },
        tournament: {
          _id: { toString: () => "tttttttttttttttttttttttt" },
          status: "active",
          createdBy: "u1",
        },
        save: mock.fn(async () => {}),
      };
      mockMatchFindById.mock.mockImplementation(() => ({
        populate: async () => match,
      }));
      const req = mockReq({
        params: { id: "m1" },
        body: { winnerId: p2Id },
      });
      const res = mockRes();
      await recordResult(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(match.winnerId, p2Id);
      assert.strictEqual(match.loserId, p1Id);
    });
  });

  describe("reportResult — remaining branch coverage", () => {
    it("initializes reportedResults when the match has none yet", async () => {
      const p1Id = "aaaaaaaaaaaaaaaaaaaaaaaa";
      const p2Id = "bbbbbbbbbbbbbbbbbbbbbbbb";
      const match = {
        status: "pending",
        reportedResults: undefined,
        player1: { participantId: p1Id, name: "Alice", faction: "" },
        player2: { participantId: p2Id, name: "Bob", faction: "" },
        tournament: {
          _id: { toString: () => "tttttttttttttttttttttttt" },
          status: "active",
          createdBy: "cccccccccccccccccccccccc",
          participants: [],
        },
        save: mock.fn(async () => {}),
      };
      mockMatchFindById.mock.mockImplementation(() => ({
        populate: async () => match,
      }));
      const req = mockReq({
        params: { id: "m1" },
        body: { winnerId: p1Id },
        user: { id: "x", username: "Alice", isGuest: false },
      });
      const res = mockRes();
      await reportResult(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(match.reportedResults.length, 1);
    });

    it("filters out a prior report from the same non-player creator using the userId fallback", async () => {
      const p1Id = "aaaaaaaaaaaaaaaaaaaaaaaa";
      const p2Id = "bbbbbbbbbbbbbbbbbbbbbbbb";
      const creatorId = "cccccccccccccccccccccccc";
      const match = {
        status: "pending",
        reportedResults: [
          { reportedBy: creatorId, reportedByName: "Creator", winnerId: p2Id },
        ],
        player1: { participantId: p1Id, name: "Alice", faction: "" },
        player2: { participantId: p2Id, name: "Bob", faction: "" },
        tournament: {
          _id: { toString: () => "tttttttttttttttttttttttt" },
          status: "active",
          createdBy: creatorId,
          participants: [],
        },
        save: mock.fn(async () => {}),
      };
      mockMatchFindById.mock.mockImplementation(() => ({
        populate: async () => match,
      }));
      const req = mockReq({
        params: { id: "m1" },
        body: { winnerId: p1Id },
        user: { id: creatorId, username: "Creator", isGuest: false },
      });
      const res = mockRes();
      await reportResult(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      // The prior report from the creator was filtered out and replaced by this one
      assert.strictEqual(match.reportedResults.length, 1);
      assert.strictEqual(match.reportedResults[0].winnerId, p1Id);
    });

    it("logs consensus completion using userId fallback when userName is absent", async () => {
      const p1Id = "aaaaaaaaaaaaaaaaaaaaaaaa";
      const p2Id = "bbbbbbbbbbbbbbbbbbbbbbbb";
      const guestId = "dddddddddddddddddddddddd";
      const match = {
        status: "in_progress",
        reportedResults: [
          { reportedBy: p1Id, reportedByName: "Alice", winnerId: p1Id },
        ],
        player1: { participantId: p1Id, name: "Alice", faction: "" },
        player2: { participantId: p2Id, name: guestId, faction: "" },
        tournament: {
          _id: { toString: () => "tttttttttttttttttttttttt" },
          status: "active",
          createdBy: "cccccccccccccccccccccccc",
          participants: [],
        },
        save: mock.fn(async () => {}),
      };
      mockMatchFindById.mock.mockImplementation(() => ({
        populate: async () => match,
      }));
      const req = mockReq({
        params: { id: "m1" },
        body: { winnerId: p1Id },
        user: { id: guestId, username: undefined, isGuest: false },
      });
      const res = mockRes();
      await reportResult(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(match.status, "completed");
    });
  });

  describe("overrideResult — default reason fallback", () => {
    it("stores an empty reason and logs 'none' when no reason is supplied", async () => {
      const creatorId = "cccccccccccccccccccccccc";
      const p1Id = "aaaaaaaaaaaaaaaaaaaaaaaa";
      const p2Id = "bbbbbbbbbbbbbbbbbbbbbbbb";
      const match = {
        status: "completed",
        resultOverrides: [],
        player1: { participantId: p1Id, name: "Alice", faction: "" },
        player2: { participantId: p2Id, name: "Bob", faction: "" },
        tournament: {
          _id: { toString: () => "tttttttttttttttttttttttt" },
          status: "active",
          createdBy: creatorId,
        },
        winnerId: p1Id,
        completedAt: new Date(),
        save: mock.fn(async () => {}),
      };
      mockMatchFindById.mock.mockImplementation(() => ({
        populate: async () => match,
      }));
      const req = mockReq({
        params: { id: "m1" },
        body: { winnerId: p2Id },
        user: { id: creatorId },
      });
      const res = mockRes();
      await overrideResult(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(match.resultOverrides[0].reason, "");
    });
  });
});
