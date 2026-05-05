import Match from "../../../domain/models/match.js";
import Tournament from "../../../domain/models/tournament.js";
import logger from "../../../infrastructure/utils/logger.js";

// GET /stats  — aggregate statistics across all tournaments and matches
export const getStats = async (_req, res) => {
  try {
    const [
      tournamentStats,
      topPlayers,
      topFactions,
      topCreators,
      matchStats,
      recentTournaments,
    ] = await Promise.all([
      // Tournament counts by status
      Tournament.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),

      // Top winning players (from completed matches — winner name)
      Match.aggregate([
        { $match: { status: "completed", winnerId: { $ne: null } } },
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
        {
          $project: {
            name: "$_id",
            wins: 1,
            factions: 1,
            _id: 0,
          },
        },
      ]),

      // Top winning factions
      Match.aggregate([
        { $match: { status: "completed", winnerId: { $ne: null } } },
        {
          $project: {
            winnerFaction: {
              $cond: [
                { $eq: ["$winnerId", "$player1.participantId"] },
                "$player1.faction",
                "$player2.faction",
              ],
            },
          },
        },
        { $match: { winnerFaction: { $ne: "" } } },
        {
          $group: {
            _id: "$winnerFaction",
            wins: { $sum: 1 },
          },
        },
        { $sort: { wins: -1 } },
        { $limit: 10 },
        { $project: { faction: "$_id", wins: 1, _id: 0 } },
      ]),

      // Most active tournament creators
      Tournament.aggregate([
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

      // Match completion stats
      Match.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),

      // Most recent completed tournaments
      Tournament.find({ status: "completed" })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("name tournamentType participants playerCount createdAt")
        .lean(),
    ]);

    // Shape tournament counts
    const tCounts = { pending: 0, active: 0, completed: 0, total: 0 };
    for (const { _id, count } of tournamentStats) {
      tCounts[_id] = count;
      tCounts.total += count;
    }

    // Shape match counts
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

    return res.status(200).json({
      success: true,
      data: {
        tournaments: tCounts,
        matches: { ...mCounts, completionRate },
        topPlayers,
        topFactions,
        topCreators,
        recentTournaments,
      },
    });
  } catch (error) {
    logger.error(`Stats error: ${error.message}`, { error });
    return res.status(500).json({
      success: false,
      message: "Failed to fetch statistics",
      error: error.message,
    });
  }
};
