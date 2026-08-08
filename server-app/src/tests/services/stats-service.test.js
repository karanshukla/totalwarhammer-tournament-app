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
const mockTournamentFind = mock.fn();
mock.module("../../domain/models/tournament.js", {
  defaultExport: {
    aggregate: mockTournamentAggregate,
    find: mockTournamentFind,
  },
});

const { getGlobalStats, invalidateStatsCache } =
  await import("../../infrastructure/services/stats-service.js");

function makeLeanChain(data = []) {
  const chain = {
    sort: () => chain,
    limit: () => chain,
    select: () => chain,
    lean: async () => data,
  };
  return chain;
}

function setupMongoDefaults() {
  mockMatchAggregate.mock.mockImplementation(async () => []);
  mockTournamentAggregate.mock.mockImplementation(async () => []);
  mockTournamentFind.mock.mockImplementation(() => makeLeanChain());
}

describe("stats-service", () => {
  beforeEach(() => {
    mockRedisGet.mock.resetCalls();
    mockRedisSet.mock.resetCalls();
    mockRedisDel.mock.resetCalls();
    mockGetRedisClient.mock.resetCalls();
    mockMatchAggregate.mock.resetCalls();
    mockTournamentAggregate.mock.resetCalls();
    mockTournamentFind.mock.resetCalls();

    mockRedisGet.mock.mockImplementation(async () => null);
    mockRedisSet.mock.mockImplementation(async () => "OK");
    mockRedisClient.isReady = true;
    mockGetRedisClient.mock.mockImplementation(() => mockRedisClient);
    setupMongoDefaults();
  });

  // ─── getGlobalStats ──────────────────────────────────────────────────────────

  describe("getGlobalStats", () => {
    it("returns cached stats from Redis without querying MongoDB", async () => {
      const cached = {
        cachedAt: "2024-01-01T00:00:00.000Z",
        wh3: {
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
          topFactions: [],
          topCreators: [],
          recentTournaments: [],
          recentWinners: [],
        },
        "40k": {
          tournaments: { pending: 0, active: 0, completed: 1, total: 1 },
          matches: {
            pending: 0,
            in_progress: 0,
            completed: 2,
            disputed: 0,
            total: 2,
            completionRate: 100,
          },
          topPlayers: [],
          topFactions: [],
          topCreators: [],
          recentTournaments: [],
          recentWinners: [],
        },
      };
      mockRedisGet.mock.mockImplementation(async () => JSON.stringify(cached));

      const result = await getGlobalStats();

      assert.deepStrictEqual(result, cached);
      assert.strictEqual(mockMatchAggregate.mock.calls.length, 0);
      assert.strictEqual(mockTournamentAggregate.mock.calls.length, 0);
      assert.strictEqual(mockTournamentFind.mock.calls.length, 0);
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
      // recentTournaments is fetched once per game (wh3 + 40k).
      assert.strictEqual(mockTournamentFind.mock.calls.length, 2);

      assert.strictEqual(mockRedisSet.mock.calls.length, 1);
      const [key, value, opts] = mockRedisSet.mock.calls[0].arguments;
      assert.strictEqual(key, "twt:stats:global");
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
      mockTournamentAggregate.mock.mockImplementation(async () => [
        { _id: "pending", count: 2 },
        { _id: "active", count: 1 },
        { _id: "completed", count: 5 },
      ]);

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
      mockMatchAggregate.mock.mockImplementation(async (pipeline) => {
        // The match-stats-by-status pipeline is the only Match aggregate whose
        // final stage groups on _id: "$status" with no winner projection.
        const last = pipeline[pipeline.length - 1];
        if (last?.$group?._id === "$status" && last.$group.count?.$sum === 1) {
          return [
            { _id: "completed", count: 8 },
            { _id: "pending", count: 2 },
          ];
        }
        return [];
      });

      const result = await getGlobalStats();

      for (const game of ["wh3", "40k"]) {
        assert.strictEqual(result[game].matches.completed, 8);
        assert.strictEqual(result[game].matches.pending, 2);
        assert.strictEqual(result[game].matches.total, 10);
        assert.strictEqual(result[game].matches.completionRate, 80);
      }
    });
  });

  // ─── invalidateStatsCache ────────────────────────────────────────────────────

  describe("invalidateStatsCache", () => {
    it("calls redis.del with the correct cache key", async () => {
      await invalidateStatsCache();

      assert.strictEqual(mockRedisDel.mock.calls.length, 1);
      assert.strictEqual(
        mockRedisDel.mock.calls[0].arguments[0],
        "twt:stats:global",
      );
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
