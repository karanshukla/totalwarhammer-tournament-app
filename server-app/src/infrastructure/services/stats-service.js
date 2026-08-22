import Match from "../../domain/models/match.js";
import Tournament from "../../domain/models/tournament.js";

import { getRedisClient } from "./redis-service.js";

// v2 namespace: the cached payload gained per-list totals and richer per-row
// fields, so a pre-upgrade blob is no longer a valid response body.
const CACHE_PREFIX = "twt:stats:global:v2";
const LEGACY_CACHE_KEY = "twt:stats:global";
const CACHE_TTL = 300; // 5 minutes

export const STATS_RANGES = ["7d", "30d", "90d", "all"];
const RANGE_DAYS = { "7d": 7, "30d": 30, "90d": 90 };

export const MAX_LIST_LIMIT = 200;

// Each range is cached as one wide window that every paged request slices, so
// paging never re-queries MongoDB. Recent tournaments carry their embedded
// participant arrays, so they get a smaller window to keep the blob light.
const LIST_WINDOW = 200;
const RECENT_TOURNAMENTS_WINDOW = 50;

const LIST_SECTIONS = [
  "topPlayers",
  "topFactions",
  "topCreators",
  "recentWinners",
  "recentTournaments",
];

// Omitting limit/offset must reproduce the historical caps exactly.
const DEFAULT_LIMITS = {
  topPlayers: 10,
  topFactions: 10,
  topCreators: 5,
  recentWinners: 10,
  recentTournaments: 5,
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const normaliseRange = (range) =>
  STATS_RANGES.includes(range) ? range : "all";

const cacheKeyFor = (range) => `${CACHE_PREFIX}:${range}`;

function rangeStart(range) {
  const days = RANGE_DAYS[range];
  return days ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : null;
}

export async function getGlobalStats({ range, limit, offset } = {}) {
  const window = await getStatsWindow(normaliseRange(range));
  return sliceStats(window, limit, offset);
}

async function getStatsWindow(range) {
  const redis = getRedisClient();
  const key = cacheKeyFor(range);

  if (redis?.isReady) {
    try {
      const cached = await redis.get(key);
      if (cached) return JSON.parse(cached);
    } catch {
      // fall through to MongoDB
    }
  }

  const stats = await computeGlobalStats(range);

  if (redis?.isReady) {
    redis.set(key, JSON.stringify(stats), { EX: CACHE_TTL }).catch(() => {});
  }

  return stats;
}

// Cut the cached window down to the requested page. With no paging params the
// per-section defaults apply, which is byte-for-byte the historical response.
function sliceStats(stats, limit, offset) {
  const start = clamp(Math.trunc(offset ?? 0) || 0, 0, LIST_WINDOW);
  const pageSize =
    limit === undefined
      ? null
      : clamp(Math.trunc(limit) || 1, 1, MAX_LIST_LIMIT);

  const sliced = { cachedAt: stats.cachedAt, range: stats.range };

  for (const game of ["wh3", "40k"]) {
    const source = stats[game];
    const scoped = { ...source };
    for (const section of LIST_SECTIONS) {
      const size = pageSize ?? DEFAULT_LIMITS[section];
      scoped[section] = (source[section] ?? []).slice(start, start + size);
    }
    sliced[game] = scoped;
  }

  return sliced;
}

export async function invalidateStatsCache() {
  const redis = getRedisClient();
  if (redis?.isReady) {
    await redis.del([...STATS_RANGES.map(cacheKeyFor), LEGACY_CACHE_KEY]);
  }
}

// Per-game $match predicate on the joined tournament's 40k flag.
// wh3 → exclude 40k tournaments (historical behavior, unchanged numbers);
// 40k → only 40k tournaments.
const enable40kFilter = (game) =>
  game === "40k" ? { $eq: true } : { $ne: true };

// Reusable pipeline stages to join a match's tournament and scope it to a game.
const matchJoinStages = (game) => [
  {
    $lookup: {
      from: "tournaments",
      localField: "tournament",
      foreignField: "_id",
      as: "_tournament",
    },
  },
  { $unwind: { path: "$_tournament", preserveNullAndEmptyArrays: true } },
  {
    $match: {
      "_tournament.enable40kFactions": enable40kFilter(game),
    },
  },
];

const completedMatchesSince = (since) => ({
  status: "completed",
  ...(since ? { completedAt: { $gte: since } } : {}),
});

// Flatten a match into one document per player slot, tagged with whether that
// slot won, so wins and appearances come out of a single pass.
const perSlotStages = [
  {
    $project: {
      winnerId: 1,
      slots: [
        {
          name: "$player1.name",
          faction: "$player1.faction",
          participantId: "$player1.participantId",
          isBeta: { $ifNull: ["$player1.isBetaFaction", false] },
        },
        {
          name: "$player2.name",
          faction: "$player2.faction",
          participantId: "$player2.participantId",
          isBeta: { $ifNull: ["$player2.isBetaFaction", false] },
        },
      ],
    },
  },
  { $unwind: "$slots" },
  {
    $project: {
      name: "$slots.name",
      faction: "$slots.faction",
      isBeta: "$slots.isBeta",
      isWinner: {
        $and: [
          { $ne: ["$winnerId", null] },
          { $ne: ["$slots.participantId", null] },
          { $eq: ["$winnerId", "$slots.participantId"] },
        ],
      },
    },
  },
];

const winRateExpr = {
  $cond: [
    { $gt: ["$matchesPlayed", 0] },
    {
      $round: [
        { $multiply: [{ $divide: ["$wins", "$matchesPlayed"] }, 100] },
        0,
      ],
    },
    0,
  ],
};

// A $facet returning both the capped window of rows and the full row count, so
// the UI can render "showing 1–10 of 47" without a second query.
const windowedFacet = (sort, projection, size = LIST_WINDOW) => ({
  $facet: {
    rows: [{ $sort: sort }, { $limit: size }, { $project: projection }],
    total: [{ $count: "value" }],
  },
});

function unpackFacet(result) {
  const { rows = [], total = [] } = result?.[0] ?? {};
  return { rows, total: total[0]?.value ?? 0 };
}

// Compute the stats sub-object for a single game ("wh3" | "40k"), scoped to
// `since` (null = all time). Tournament and match status counts are deliberately
// left all-time: a status is a current-state fact, not a historical one.
async function computeGameStats(game, since) {
  const excludeBetaFactions = game === "wh3";
  const gameFilter = enable40kFilter(game);

  const [
    tournamentStats,
    topPlayersFacet,
    topFactionsFacet,
    topCreatorsFacet,
    matchStats,
    recentWinnersFacet,
    recentTournamentsFacet,
  ] = await Promise.all([
    Tournament.aggregate([
      { $match: { enable40kFactions: gameFilter } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),

    Match.aggregate([
      { $match: completedMatchesSince(since) },
      ...matchJoinStages(game),
      ...perSlotStages,
      {
        $group: {
          _id: "$name",
          wins: { $sum: { $cond: ["$isWinner", 1, 0] } },
          matchesPlayed: { $sum: 1 },
          factions: { $addToSet: { $cond: ["$isWinner", "$faction", null] } },
        },
      },
      // "Top players" has always meant players with at least one win.
      { $match: { wins: { $gt: 0 } } },
      windowedFacet(
        { wins: -1, _id: 1 },
        {
          name: "$_id",
          wins: 1,
          matchesPlayed: 1,
          losses: { $subtract: ["$matchesPlayed", "$wins"] },
          winRate: winRateExpr,
          factions: {
            $filter: {
              input: "$factions",
              as: "f",
              cond: { $ne: ["$$f", null] },
            },
          },
          _id: 0,
        },
      ),
    ]),

    Match.aggregate([
      { $match: completedMatchesSince(since) },
      ...matchJoinStages(game),
      ...perSlotStages,
      {
        // For wh3 we keep the historical beta-faction exclusion (every wh3
        // slot is non-beta, so this only ever strips stray beta-tagged
        // matches that slipped in). For 40k the slots ARE beta-tagged, so
        // excluding them would erase every faction — skip the filter there.
        $match: excludeBetaFactions
          ? { faction: { $ne: "" }, isBeta: { $ne: true } }
          : { faction: { $ne: "" } },
      },
      {
        $group: {
          _id: "$faction",
          wins: { $sum: { $cond: ["$isWinner", 1, 0] } },
          matchesPlayed: { $sum: 1 },
        },
      },
      { $match: { wins: { $gt: 0 } } },
      windowedFacet(
        { wins: -1, _id: 1 },
        {
          faction: "$_id",
          wins: 1,
          matchesPlayed: 1,
          losses: { $subtract: ["$matchesPlayed", "$wins"] },
          winRate: winRateExpr,
          _id: 0,
        },
      ),
    ]),

    // Creator counts stay all-time on purpose: tournaments created is a
    // cumulative reputation metric and the Tournament doc has no per-win date.
    Tournament.aggregate([
      { $match: { enable40kFactions: gameFilter } },
      {
        $group: {
          _id: "$createdBy",
          tournamentsCreated: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
        },
      },
      {
        $facet: {
          rows: [
            { $sort: { tournamentsCreated: -1, _id: 1 } },
            { $limit: LIST_WINDOW },
            {
              $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "_id",
                as: "user",
              },
            },
            { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                username: { $ifNull: ["$user.username", "Unknown"] },
                tournamentsCreated: 1,
                completed: 1,
                _id: 0,
              },
            },
          ],
          total: [{ $count: "value" }],
        },
      },
    ]),

    Match.aggregate([
      ...matchJoinStages(game),
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),

    recentWinnersPipeline(gameFilter, since),

    Tournament.aggregate([
      {
        $match: {
          status: "completed",
          enable40kFactions: gameFilter,
          ...(since ? { createdAt: { $gte: since } } : {}),
        },
      },
      windowedFacet(
        { createdAt: -1 },
        {
          name: 1,
          tournamentType: 1,
          participants: 1,
          playerCount: 1,
          createdAt: 1,
        },
        RECENT_TOURNAMENTS_WINDOW,
      ),
    ]),
  ]);

  const tCounts = { pending: 0, active: 0, completed: 0, total: 0 };
  for (const { _id, count } of tournamentStats) {
    tCounts[_id] = count;
    tCounts.total += count;
  }

  const mCounts = {
    pending: 0,
    in_progress: 0,
    completed: 0,
    disputed: 0,
    total: 0,
  };
  for (const { _id, count } of matchStats) {
    mCounts[_id] = count;
    mCounts.total += count;
  }
  const completionRate =
    mCounts.total > 0
      ? Math.round((mCounts.completed / mCounts.total) * 100)
      : 0;

  const topPlayers = unpackFacet(topPlayersFacet);
  const topFactions = unpackFacet(topFactionsFacet);
  const topCreators = unpackFacet(topCreatorsFacet);
  const recentWinners = unpackFacet(recentWinnersFacet);
  const recentTournaments = unpackFacet(recentTournamentsFacet);

  return {
    tournaments: tCounts,
    matches: { ...mCounts, completionRate },
    topPlayers: topPlayers.rows,
    topPlayersTotal: topPlayers.total,
    topFactions: topFactions.rows,
    topFactionsTotal: topFactions.total,
    topCreators: topCreators.rows,
    topCreatorsTotal: topCreators.total,
    recentWinners: recentWinners.rows,
    recentWinnersTotal: recentWinners.total,
    recentTournaments: recentTournaments.rows,
    recentTournamentsTotal: recentTournaments.total,
  };
}

async function computeGlobalStats(range) {
  const since = rangeStart(range);

  const [wh3, k40] = await Promise.all([
    computeGameStats("wh3", since),
    computeGameStats("40k", since),
  ]);

  return {
    cachedAt: new Date().toISOString(),
    range,
    wh3,
    "40k": k40,
  };
}

// The winner of each tournament's most recently completed match, scoped to a
// game by its enable40kFactions comparison operator and to the selected range.
function recentWinnersPipeline(enable40kOperator, since) {
  return Match.aggregate([
    { $match: { ...completedMatchesSince(since), winnerId: { $ne: null } } },
    { $sort: { completedAt: -1 } },
    {
      $group: {
        _id: "$tournament",
        lastMatchId: { $first: "$_id" },
        completedAt: { $first: "$completedAt" },
        winnerId: { $first: "$winnerId" },
        player1: { $first: "$player1" },
        player2: { $first: "$player2" },
      },
    },
    {
      $lookup: {
        from: "tournaments",
        localField: "_id",
        foreignField: "_id",
        as: "tournamentDoc",
      },
    },
    {
      $unwind: { path: "$tournamentDoc", preserveNullAndEmptyArrays: true },
    },
    {
      $match: {
        "tournamentDoc.status": "completed",
        "tournamentDoc.enable40kFactions": enable40kOperator,
      },
    },
    {
      $project: {
        tournamentName: { $ifNull: ["$tournamentDoc.name", "Unknown"] },
        tournamentType: { $ifNull: ["$tournamentDoc.tournamentType", ""] },
        completedAt: 1,
        winnerName: {
          $cond: [
            { $eq: ["$winnerId", "$player1.participantId"] },
            "$player1.name",
            "$player2.name",
          ],
        },
        winnerFaction: {
          $cond: [
            { $eq: ["$winnerId", "$player1.participantId"] },
            "$player1.faction",
            "$player2.faction",
          ],
        },
        _id: 0,
      },
    },
    windowedFacet(
      { completedAt: -1 },
      {
        tournamentName: 1,
        tournamentType: 1,
        completedAt: 1,
        winnerName: 1,
        winnerFaction: 1,
        _id: 0,
      },
    ),
  ]);
}
