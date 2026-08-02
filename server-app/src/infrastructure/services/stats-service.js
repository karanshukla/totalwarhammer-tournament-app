import Match from "../../domain/models/match.js";
import Tournament from "../../domain/models/tournament.js";

import { getRedisClient } from "./redis-service.js";

const CACHE_KEY = "twt:stats:global";
const CACHE_TTL = 300; // 5 minutes

export async function getGlobalStats() {
  const redis = getRedisClient();

  if (redis?.isReady) {
    try {
      const cached = await redis.get(CACHE_KEY);
      if (cached) return JSON.parse(cached);
    } catch {
      // fall through to MongoDB
    }
  }

  const stats = await computeGlobalStats();

  if (redis?.isReady) {
    redis
      .set(CACHE_KEY, JSON.stringify(stats), { EX: CACHE_TTL })
      .catch(() => {});
  }

  return stats;
}

export async function invalidateStatsCache() {
  const redis = getRedisClient();
  if (redis?.isReady) {
    await redis.del(CACHE_KEY);
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

// Compute the stats sub-object for a single game ("wh3" | "40k").
// The wh3 sub-object is byte-identical to the historical flat output.
async function computeGameStats(game) {
  const excludeBetaFactions = game === "wh3";

  const [tournamentStats, topPlayers, topFactions, topCreators, matchStats] =
    await Promise.all([
      Tournament.aggregate([
        { $match: { enable40kFactions: enable40kFilter(game) } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),

      Match.aggregate([
        { $match: { status: "completed", winnerId: { $ne: null } } },
        ...matchJoinStages(game),
        {
          $project: {
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
          },
        },
        {
          $group: {
            _id: "$winnerName",
            wins: { $sum: 1 },
            factions: { $addToSet: "$winnerFaction" },
          },
        },
        { $sort: { wins: -1 } },
        { $limit: 10 },
        { $project: { name: "$_id", wins: 1, factions: 1, _id: 0 } },
      ]),

      Match.aggregate([
        { $match: { status: "completed", winnerId: { $ne: null } } },
        ...matchJoinStages(game),
        {
          $project: {
            winnerFaction: {
              $cond: [
                { $eq: ["$winnerId", "$player1.participantId"] },
                "$player1.faction",
                "$player2.faction",
              ],
            },
            winnerIsBeta: {
              $cond: [
                { $eq: ["$winnerId", "$player1.participantId"] },
                { $ifNull: ["$player1.isBetaFaction", false] },
                { $ifNull: ["$player2.isBetaFaction", false] },
              ],
            },
          },
        },
        {
          // For wh3 we keep the historical beta-faction exclusion (every wh3
          // slot is non-beta, so this only ever strips stray beta-tagged
          // matches that slipped in). For 40k the slots ARE beta-tagged, so
          // excluding them would erase every winner — skip the filter there.
          $match: excludeBetaFactions
            ? {
                winnerFaction: { $ne: "" },
                winnerIsBeta: { $ne: true },
              }
            : { winnerFaction: { $ne: "" } },
        },
        { $group: { _id: "$winnerFaction", wins: { $sum: 1 } } },
        { $sort: { wins: -1 } },
        { $limit: 10 },
        { $project: { faction: "$_id", wins: 1, _id: 0 } },
      ]),

      Tournament.aggregate([
        { $match: { enable40kFactions: enable40kFilter(game) } },
        {
          $group: {
            _id: "$createdBy",
            tournamentsCreated: { $sum: 1 },
            completed: {
              $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
            },
          },
        },
        { $sort: { tournamentsCreated: -1 } },
        { $limit: 5 },
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
      ]),

      Match.aggregate([
        ...matchJoinStages(game),
        { $group: { _id: "$status", count: { $sum: 1 } } },
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

  return {
    tournaments: tCounts,
    matches: { ...mCounts, completionRate },
    topPlayers,
    topFactions,
    topCreators,
  };
}

async function computeGlobalStats() {
  const [recentTournamentsWh3, recentTournaments40k] = await Promise.all([
    Tournament.find({
      status: "completed",
      enable40kFactions: { $ne: true },
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("name tournamentType participants playerCount createdAt")
      .lean(),
    Tournament.find({
      status: "completed",
      enable40kFactions: true,
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("name tournamentType participants playerCount createdAt")
      .lean(),
  ]);

  const [recentWinnersWh3, recentWinners40k] = await Promise.all([
    recentWinnersPipeline({ $ne: true }),
    recentWinnersPipeline({ $eq: true }),
  ]);

  const [wh3, k40] = await Promise.all([
    computeGameStats("wh3"),
    computeGameStats("40k"),
  ]);

  return {
    cachedAt: new Date().toISOString(),
    wh3: {
      ...wh3,
      recentTournaments: recentTournamentsWh3,
      recentWinners: recentWinnersWh3,
    },
    "40k": {
      ...k40,
      recentTournaments: recentTournaments40k,
      recentWinners: recentWinners40k,
    },
  };
}

// Shared pipeline for "recent winners in the last 7 days", scoped to a game by
// its enable40kFactions comparison operator.
function recentWinnersPipeline(enable40kOperator) {
  return Match.aggregate([
    {
      $match: {
        status: "completed",
        winnerId: { $ne: null },
        completedAt: {
          $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    },
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
    { $sort: { completedAt: -1 } },
    { $limit: 10 },
  ]);
}
