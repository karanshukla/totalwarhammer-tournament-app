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
  },
});

const { getMatchesByTournament, getMatchById, createMatch } = await import(
  "../interfaces/http/controllers/match-controller.js"
);

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
  });

  describe("getMatchesByTournament", () => {
    it("should return matches for a tournament", async () => {
      const matches = [{ id: "m1" }];
      mockMatchFind.mock.mockImplementation(() => ({
        sort: mock.fn(async () => matches),
      }));
      const req = mockReq({ params: { tournamentId: "t1" } });
      const res = mockRes();
      await getMatchesByTournament(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.deepStrictEqual(res.json.mock.calls[0].arguments[0].data, matches);
    });
  });

  describe("getMatchById", () => {
    it("should return 404 if match not found", async () => {
      mockMatchFindById.mock.mockImplementation(async () => null);
      const req = mockReq({ params: { id: "m1" } });
      const res = mockRes();
      await getMatchById(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 404);
    });

    it("should return match if found", async () => {
      const match = { id: "m1" };
      mockMatchFindById.mock.mockImplementation(async () => match);
      const req = mockReq({ params: { id: "m1" } });
      const res = mockRes();
      await getMatchById(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.deepStrictEqual(res.json.mock.calls[0].arguments[0].data, match);
    });
  });

  describe("createMatch", () => {
    it("should return 404 if tournament not found", async () => {
      mockTournamentFindOne.mock.mockImplementation(async () => null);
      const req = mockReq({ body: { tournamentId: "t1" } });
      const res = mockRes();
      await createMatch(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 404);
    });

    it("should create match and return 201", async () => {
      mockTournamentFindOne.mock.mockImplementation(async () => ({ status: "active" }));
      mockMatchCreate.mock.mockImplementation(async (data) => data);
      const req = mockReq({
        body: {
          tournamentId: "t1",
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
});
