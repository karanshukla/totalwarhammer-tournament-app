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

mock.module("../domain/models/tournament.js", {
  namedExports: {},
  defaultExport: {
    create: mockTournamentCreate,
    find: mockTournamentFind,
    findOne: mockTournamentFindOne,
    findOneAndUpdate: mockTournamentFindOneAndUpdate,
    findById: mockTournamentFindById,
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
  getUserTournaments,
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
