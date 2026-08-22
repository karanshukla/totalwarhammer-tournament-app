import assert from "node:assert";
import { describe, it, beforeEach, mock } from "node:test";

// ── Redis mock ────────────────────────────────────────────────────────────────
const mockRedisGet = mock.fn(async () => null);
const mockRedisSet = mock.fn(async () => "OK");
const mockRedisDel = mock.fn(async () => 1);
const mockRedisClient = {
  isReady: true,
  get: mockRedisGet,
  set: mockRedisSet,
  del: mockRedisDel,
};
const mockGetRedisClient = mock.fn(() => mockRedisClient);

mock.module("../../infrastructure/services/redis-service.js", {
  namedExports: { getRedisClient: mockGetRedisClient },
});

// ── MongoDB model mocks ───────────────────────────────────────────────────────
const mockMatchAggregate = mock.fn(async () => []);
mock.module("../../domain/models/match.js", {
  defaultExport: { aggregate: mockMatchAggregate },
});

const mockTournamentAggregate = mock.fn(async () => []);
mock.module("../../domain/models/tournament.js", {
  defaultExport: { aggregate: mockTournamentAggregate },
});

const { getGlobalStats, invalidateStatsCache, STATS_RANGES, MAX_LIST_LIMIT } =
  await import("../../infrastructure/services/stats-service.js");

const ALL_RANGE_KEY = "twt:stats:global:v2:all";

// Every windowed list section comes back from a $facet, so the mocks have to
// speak that shape whenever a test wants rows out of an aggregate.
const facet = (rows) => [{ rows, total: [{ value: rows.length }] }];

// Identify a pipeline by the accumulator it groups on, so a mock can answer
// only the aggregate a test cares about.
const groupsOn = (pipeline, id) =>
  pipeline.some((stage) => stage?.$group?._id === id);

function setupMongoDefaults() {
  mockMatchAggregate.mock.mockImplementation(async () => []);
  mockTournamentAggregate.mock.mockImplementation(async () => []);
}

describe("stats-service", () => {
  beforeEach(() => {
    mockRedisGet.mock.resetCalls();
    mockRedisSet.mock.resetCalls();
    mockRedisDel.mock.resetCalls();
    mockGetRedisClient.mock.resetCalls();
    mockMatchAggregate.mock.resetCalls();
    mockTournamentAggregate.mock.resetCalls();

    mockRedisGet.mock.mockImplementation(async () => null);
    mockRedisSet.mock.mockImplementation(async () => "OK");
    mockRedisClient.isReady = true;
    mockGetRedisClient.mock.mockImplementation(() => mockRedisClient);
    setupMongoDefaults();
  });

  // ─── getGlobalStats ──────────────────────────────────────────────────────────

  describe("getGlobalStats", () => {
    it("returns cached stats from Redis without querying MongoDB", async () => {
      const emptyGame = {
        tournaments: { pending: 1, active: 2, completed: 3, total: 6 },
        matches: {
          pending: 0,
          in_progress: 0,
          completed: 5,
          disputed: 0,
          total: 5,
          completionRate: 100,
        },
        topPlayers: [],
        topPlayersTotal: 0,
        topFactions: [],
        topFactionsTotal: 0,
        topCreators: [],
        topCreatorsTotal: 0,
        recentTournaments: [],
        recentTournamentsTotal: 0,
        recentWinners: [],
        recentWinnersTotal: 0,
      };
      const cached = {
        cachedAt: "2024-01-01T00:00:00.000Z",
        range: "all",
        wh3: emptyGame,
        "40k": emptyGame,
      };
      mockRedisGet.mock.mockImplementation(async () => JSON.stringify(cached));

      const result = await getGlobalStats();

      assert.deepStrictEqual(result, cached);
      assert.strictEqual(mockMatchAggregate.mock.calls.length, 0);
      assert.strictEqual(mockTournamentAggregate.mock.calls.length, 0);
    });

    it("queries MongoDB on cache miss and writes result to Redis", async () => {
      const result = await getGlobalStats();

      assert.ok(
        mockMatchAggregate.mock.calls.length > 0,
        "Match.aggregate should be called",
      );
      assert.ok(
        mockTournamentAggregate.mock.calls.length > 0,
        "Tournament.aggregate should be called",
      );

      assert.strictEqual(mockRedisSet.mock.calls.length, 1);
      const [key, value, opts] = mockRedisSet.mock.calls[0].arguments;
      assert.strictEqual(key, ALL_RANGE_KEY);
      assert.deepStrictEqual(opts, { EX: 300 });

      const stored = JSON.parse(value);
      assert.ok("cachedAt" in stored);
      assert.ok("wh3" in stored);
      assert.ok("40k" in stored);
      assert.ok("tournaments" in stored.wh3);
      assert.ok("matches" in stored.wh3);
      assert.deepStrictEqual(result, stored);
    });

    it("includes cachedAt timestamp in computed stats", async () => {
      const before = new Date().toISOString();
      const result = await getGlobalStats();
      const after = new Date().toISOString();

      assert.ok(result.cachedAt >= before);
      assert.ok(result.cachedAt <= after);
    });

    it("falls back to MongoDB without caching when Redis is not ready", async () => {
      mockRedisClient.isReady = false;

      const result = await getGlobalStats();

      assert.ok(mockMatchAggregate.mock.calls.length > 0);
      assert.strictEqual(mockRedisGet.mock.calls.length, 0);
      assert.strictEqual(mockRedisSet.mock.calls.length, 0);
      assert.ok("wh3" in result);
    });

    it("falls back to MongoDB when getRedisClient returns null", async () => {
      mockGetRedisClient.mock.mockImplementation(() => null);

      const result = await getGlobalStats();

      assert.ok(mockMatchAggregate.mock.calls.length > 0);
      assert.strictEqual(mockRedisGet.mock.calls.length, 0);
      assert.ok("wh3" in result);
    });

    it("falls back to MongoDB when Redis.get throws", async () => {
      mockRedisGet.mock.mockImplementation(async () => {
        throw new Error("Redis unavailable");
      });

      const result = await getGlobalStats();

      assert.ok(mockMatchAggregate.mock.calls.length > 0);
      assert.ok("wh3" in result);
    });

    it("swallows the error when writing the computed stats back to Redis fails", async () => {
      mockRedisSet.mock.mockImplementation(async () => {
        throw new Error("Redis write failed");
      });

      await assert.doesNotReject(() => getGlobalStats());
      // redis.set() is fire-and-forget; let its rejection settle before moving on.
      await new Promise((resolve) => setImmediate(resolve));
    });

    it("shapes tournament counts correctly from aggregate results", async () => {
      mockTournamentAggregate.mock.mockImplementation(async (pipeline) =>
        groupsOn(pipeline, "$status")
          ? [
              { _id: "pending", count: 2 },
              { _id: "active", count: 1 },
              { _id: "completed", count: 5 },
            ]
          : [],
      );

      const result = await getGlobalStats();

      // Both games receive the same mocked counts.
      for (const game of ["wh3", "40k"]) {
        assert.strictEqual(result[game].tournaments.pending, 2);
        assert.strictEqual(result[game].tournaments.active, 1);
        assert.strictEqual(result[game].tournaments.completed, 5);
        assert.strictEqual(result[game].tournaments.total, 8);
      }
    });

    it("computes completionRate from match counts", async () => {
      mockMatchAggregate.mock.mockImplementation(async (pipeline) =>
        groupsOn(pipeline, "$status")
          ? [
              { _id: "completed", count: 8 },
              { _id: "pending", count: 2 },
            ]
          : [],
      );

      const result = await getGlobalStats();

      for (const game of ["wh3", "40k"]) {
        assert.strictEqual(result[game].matches.completed, 8);
        assert.strictEqual(result[game].matches.pending, 2);
        assert.strictEqual(result[game].matches.total, 10);
        assert.strictEqual(result[game].matches.completionRate, 80);
      }
    });
  });

  // ─── Time-range scoping ──────────────────────────────────────────────────────

  describe("range scoping", () => {
    it("caches each range under its own key", async () => {
      for (const range of STATS_RANGES) {
        mockRedisSet.mock.resetCalls();
        await getGlobalStats({ range });
        assert.strictEqual(
          mockRedisSet.mock.calls[0].arguments[0],
          `twt:stats:global:v2:${range}`,
        );
      }
    });

    it("falls back to the all-time key for an unrecognised range", async () => {
      await getGlobalStats({ range: "nonsense" });

      assert.strictEqual(
        mockRedisSet.mock.calls[0].arguments[0],
        ALL_RANGE_KEY,
      );
      assert.strictEqual(
        mockRedisGet.mock.calls[0].arguments[0],
        ALL_RANGE_KEY,
      );
    });

    it("applies a completedAt lower bound to win-based aggregates for a bounded range", async () => {
      const before = Date.now();
      await getGlobalStats({ range: "30d" });

      const dated = mockMatchAggregate.mock.calls
        .map((call) => call.arguments[0][0]?.$match?.completedAt?.$gte)
        .filter(Boolean);

      assert.ok(dated.length > 0, "expected date-scoped match pipelines");
      for (const since of dated) {
        const ageDays = (before - since.getTime()) / (24 * 60 * 60 * 1000);
        assert.ok(Math.abs(ageDays - 30) < 0.01, `unexpected window: ${since}`);
      }
    });

    it("leaves status counts unscoped so a range never changes them", async () => {
      await getGlobalStats({ range: "7d" });

      const statusPipelines = [
        ...mockMatchAggregate.mock.calls,
        ...mockTournamentAggregate.mock.calls,
      ]
        .map((call) => call.arguments[0])
        .filter((pipeline) => groupsOn(pipeline, "$status"));

      assert.strictEqual(statusPipelines.length, 4); // matches + tournaments, per game
      for (const pipeline of statusPipelines) {
        assert.ok(
          !JSON.stringify(pipeline).includes("completedAt"),
          "status counts must stay all-time",
        );
      }
    });

    it("echoes the resolved range back to the caller", async () => {
      const result = await getGlobalStats({ range: "90d" });
      assert.strictEqual(result.range, "90d");
    });
  });

  // ─── Pagination ──────────────────────────────────────────────────────────────

  describe("pagination", () => {
    const players = Array.from({ length: 30 }, (_, i) => ({
      name: `player-${i}`,
      wins: 30 - i,
    }));

    beforeEach(() => {
      mockMatchAggregate.mock.mockImplementation(async (pipeline) =>
        groupsOn(pipeline, "$name") ? facet(players) : [],
      );
    });

    it("applies the historical per-section caps when limit and offset are omitted", async () => {
      const result = await getGlobalStats();

      assert.strictEqual(result.wh3.topPlayers.length, 10);
      assert.strictEqual(result.wh3.topPlayers[0].name, "player-0");
    });

    it("returns the requested page when limit and offset are supplied", async () => {
      const result = await getGlobalStats({ limit: 5, offset: 10 });

      assert.strictEqual(result.wh3.topPlayers.length, 5);
      assert.strictEqual(result.wh3.topPlayers[0].name, "player-10");
      assert.strictEqual(result.wh3.topPlayers[4].name, "player-14");
    });

    it("reports the full row count alongside the page", async () => {
      const result = await getGlobalStats({ limit: 5 });

      assert.strictEqual(result.wh3.topPlayersTotal, 30);
    });

    it("pages every list section from one cached window", async () => {
      await getGlobalStats({ limit: 5, offset: 0 });
      const aggregatesForFirstPage = mockMatchAggregate.mock.calls.length;

      mockRedisGet.mock.mockImplementation(async () =>
        JSON.stringify(JSON.parse(mockRedisSet.mock.calls[0].arguments[1])),
      );
      mockMatchAggregate.mock.resetCalls();

      const second = await getGlobalStats({ limit: 5, offset: 5 });

      assert.ok(aggregatesForFirstPage > 0);
      assert.strictEqual(
        mockMatchAggregate.mock.calls.length,
        0,
        "paging must not re-query MongoDB",
      );
      assert.strictEqual(second.wh3.topPlayers[0].name, "player-5");
    });

    it("clamps an out-of-band limit to the maximum", async () => {
      const result = await getGlobalStats({ limit: MAX_LIST_LIMIT * 10 });

      assert.strictEqual(result.wh3.topPlayers.length, players.length);
    });

    it("clamps a negative offset to the start of the list", async () => {
      const result = await getGlobalStats({ limit: 3, offset: -20 });

      assert.strictEqual(result.wh3.topPlayers[0].name, "player-0");
    });
  });

  // ─── invalidateStatsCache ────────────────────────────────────────────────────

  describe("invalidateStatsCache", () => {
    it("deletes every range variant plus the pre-v2 key", async () => {
      await invalidateStatsCache();

      assert.strictEqual(mockRedisDel.mock.calls.length, 1);
      assert.deepStrictEqual(mockRedisDel.mock.calls[0].arguments[0], [
        "twt:stats:global:v2:7d",
        "twt:stats:global:v2:30d",
        "twt:stats:global:v2:90d",
        "twt:stats:global:v2:all",
        "twt:stats:global",
      ]);
    });

    it("is a no-op when getRedisClient returns null", async () => {
      mockGetRedisClient.mock.mockImplementation(() => null);

      await invalidateStatsCache();

      assert.strictEqual(mockRedisDel.mock.calls.length, 0);
    });

    it("is a no-op when Redis is not ready", async () => {
      mockRedisClient.isReady = false;

      await invalidateStatsCache();

      assert.strictEqual(mockRedisDel.mock.calls.length, 0);
    });
  });
});
