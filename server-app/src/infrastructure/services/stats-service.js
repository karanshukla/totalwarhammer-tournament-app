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

// Reusable pipeline stages to join a match's tournament and exclude 40k tournaments
const matchTo40kFreeStages = [
  {
    $lookup: {
      from: "tournaments",
      localField: "tournament",
      foreignField: "_id",
      as: "_tournament",
    },
  },
  { $unwind: { path: "$_tournament", preserveNullAndEmptyArrays: true } },
  { $match: { "_tournament.enable40kFactions": { $ne: true } } },
];

async function computeGlobalStats() {
  const [
    tournamentStats,
    topPlayers,
    topFactions,
    topCreators,
    matchStats,
    recentTournaments,
    recentWinners,
  ] = await Promise.all([
    // Exclude 40k tournaments from counts
    Tournament.aggregate([
      { $match: { enable40kFactions: { $ne: true } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),

    Match.aggregate([
      { $match: { status: "completed", winnerId: { $ne: null } } },
      ...matchTo40kFreeStages,
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
      ...matchTo40kFreeStages,
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
        $match: {
          winnerFaction: { $ne: "" },
          winnerIsBeta: { $ne: true },
        },
      },
      { $group: { _id: "$winnerFaction", wins: { $sum: 1 } } },
      { $sort: { wins: -1 } },
      { $limit: 10 },
      { $project: { faction: "$_id", wins: 1, _id: 0 } },
    ]),

    // Exclude 40k tournaments from creator counts
    Tournament.aggregate([
      { $match: { enable40kFactions: { $ne: true } } },
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

    // Exclude matches from 40k tournaments
    Match.aggregate([
      ...matchTo40kFreeStages,
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),

    // Exclude 40k tournaments from recent list
    Tournament.find({ status: "completed", enable40kFactions: { $ne: true } })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("name tournamentType participants playerCount createdAt")
      .lean(),

    Match.aggregate([
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
      // Exclude 40k tournaments and only show completed non-40k ones
      {
        $match: {
          "tournamentDoc.status": "completed",
          "tournamentDoc.enable40kFactions": { $ne: true },
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
    cachedAt: new Date().toISOString(),
    tournaments: tCounts,
    matches: { ...mCounts, completionRate },
    topPlayers,
    topFactions,
    topCreators,
    recentTournaments,
    recentWinners,
  };
}
