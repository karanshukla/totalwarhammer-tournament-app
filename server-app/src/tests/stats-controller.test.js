import assert from "node:assert";
import { describe, it, beforeEach, mock } from "node:test";

const mockGetGlobalStats = mock.fn();
mock.module("../infrastructure/services/stats-service.js", {
  namedExports: { getGlobalStats: mockGetGlobalStats },
});

mock.module("../infrastructure/utils/logger.js", {
  defaultExport: { error: mock.fn(), info: mock.fn() },
});

const { getStats } =
  await import("../interfaces/http/controllers/stats-controller.js");

function mockRes() {
  const res = {};
  res.status = mock.fn(() => res);
  res.json = mock.fn(() => res);
  return res;
}

describe("stats-controller", () => {
  beforeEach(() => {
    mockGetGlobalStats.mock.resetCalls();
  });

  describe("getStats", () => {
    it("returns 200 with data from the stats service", async () => {
      const data = {
        cachedAt: "2024-01-01T00:00:00.000Z",
        tournaments: { pending: 0, active: 1, completed: 2, total: 3 },
        matches: { completed: 5, total: 5, completionRate: 100 },
        topPlayers: [],
        topFactions: [],
        topCreators: [],
        recentTournaments: [],
        recentWinners: [],
      };
      mockGetGlobalStats.mock.mockImplementation(async () => data);

      const res = mockRes();
      await getStats({ query: {} }, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.deepStrictEqual(res.json.mock.calls[0].arguments[0], {
        success: true,
        data,
      });
    });

    it("forwards range, limit and offset to the stats service", async () => {
      mockGetGlobalStats.mock.mockImplementation(async () => ({}));

      const res = mockRes();
      await getStats({ query: { range: "30d", limit: 25, offset: 50 } }, res);

      assert.deepStrictEqual(mockGetGlobalStats.mock.calls[0].arguments[0], {
        range: "30d",
        limit: 25,
        offset: 50,
      });
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
    });

    it("returns 500 when the stats service throws", async () => {
      mockGetGlobalStats.mock.mockImplementation(async () => {
        throw new Error("DB connection failed");
      });

      const res = mockRes();
      await getStats({ query: {} }, res);

      assert.strictEqual(res.status.mock.calls[0].arguments[0], 500);
      const body = res.json.mock.calls[0].arguments[0];
      assert.strictEqual(body.success, false);
      assert.ok(body.message);
    });
  });
});
