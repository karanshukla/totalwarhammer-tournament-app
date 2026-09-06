import Match from "../../../domain/models/match.js";
import Tournament from "../../../domain/models/tournament.js";
import User from "../../../domain/models/user.js";

/**
 * Compute one game's per-user stats. `enable40kOperator` is the MongoDB
 * comparison applied to the tournament's enable40kFactions flag:
 *   wh3 → { $ne: true } (historical, unchanged numbers)
 *   40k → { $eq: true }
 * For wh3 we keep the historical per-slot beta-faction exclusion; for 40k the
 * slots ARE beta-tagged, so we count them.
 *
 * `since` scopes match-derived numbers to a time window (null = all time);
 * tournamentsCreated stays all-time. `detail === "full"` adds the per-faction
 * win split, which is off by default because this endpoint is uncached.
 */
async function computeUserGameStats(
  userId,
  username,
  enable40kOperator,
  excludeBetaFactions,
  { since = null, detail = "summary", limit, offset } = {},
) {
  const tournamentIds = await Tournament.find({
    enable40kFactions: enable40kOperator,
  })
    .select("_id")
    .lean()
    .then((docs) => docs.map((d) => d._id));

  const matchFilter = {
    status: "completed",
    tournament: { $in: tournamentIds },
    ...(since ? { completedAt: { $gte: since } } : {}),
  };

  const [tournamentsCreatedCount, matchesAsP1, matchesAsP2] = await Promise.all(
    [
      Tournament.countDocuments({
        createdBy: userId,
        enable40kFactions: enable40kOperator,
      }),

      Match.find({ ...matchFilter, "player1.name": username })
        .select("player1 player2 winnerId tournament")
        .lean(),

      Match.find({ ...matchFilter, "player2.name": username })
        .select("player1 player2 winnerId tournament")
        .lean(),
    ],
  );

  const allMatches = [...matchesAsP1, ...matchesAsP2];
  const ownSlot = (m) => (m.player1.name === username ? m.player1 : m.player2);
  const isWin = (m) => {
    const slot = ownSlot(m);
    return (
      !!m.winnerId &&
      !!slot.participantId &&
      m.winnerId.toString() === slot.participantId.toString()
    );
  };

  const wins = allMatches.filter(isWin).length;
  const losses = allMatches.length - wins;

  const factionTallies = new Map();
  for (const m of allMatches) {
    const slot = ownSlot(m);
    if (!slot.faction || (excludeBetaFactions && slot.isBetaFaction)) continue;
    const tally = factionTallies.get(slot.faction) ?? { count: 0, wins: 0 };
    tally.count += 1;
    if (isWin(m)) tally.wins += 1;
    factionTallies.set(slot.faction, tally);
  }

  const rankedFactions = [...factionTallies.entries()]
    .sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]))
    .map(([name, tally]) =>
      detail === "full"
        ? { name, count: tally.count, wins: tally.wins }
        : { name, count: tally.count },
    );

  const start = offset ?? 0;
  const factions =
    limit === undefined && offset === undefined
      ? rankedFactions
      : rankedFactions.slice(start, start + (limit ?? rankedFactions.length));

  return {
    tournamentsCreated: tournamentsCreatedCount,
    matchesPlayed: allMatches.length,
    wins,
    losses,
    factions,
    factionsTotal: rankedFactions.length,
  };
}

const USER_STATS_RANGE_DAYS = { "7d": 7, "30d": 30, "90d": 90 };

/** @type {import('express').RequestHandler} */
export const getUserStats = async (req, res) => {
  try {
    const userId = req.user.id;
    if (req.user.isGuest) {
      return res.status(403).json({
        success: false,
        message: "This action requires a registered account.",
      });
    }

    const user = await User.findById(userId).select("username").lean();
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const username = user.username;
    const { range = "all", detail = "summary", limit, offset } = req.query;
    const days = USER_STATS_RANGE_DAYS[range];
    const options = {
      since: days ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : null,
      detail,
      limit,
      offset,
    };

    const [wh3, k40] = await Promise.all([
      computeUserGameStats(userId, username, { $ne: true }, true, options),
      computeUserGameStats(userId, username, { $eq: true }, false, options),
    ]);

    return res.status(200).json({
      success: true,
      data: { range, wh3, "40k": k40 },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user stats",
    });
  }
};
