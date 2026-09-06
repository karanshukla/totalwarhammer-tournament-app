import Match from "../../../domain/models/match.js";
import {
  singleElimAdvance,
  doubleElimAdvance,
  roundRobinAdvance,
  swissAdvance,
} from "../../../domain/services/tournament-service.js";
import { invalidateStatsCache } from "../../../infrastructure/services/stats-service.js";
import {
  emitTournamentUpdated,
  emitMatchesAppended,
} from "../../../infrastructure/socket/socket-service.js";
import logger from "../../../infrastructure/utils/logger.js";

async function completeTournament(tournament, formatLabel, logSuffix = "") {
  tournament.status = "completed";
  await tournament.save();
  invalidateStatsCache().catch(() => {});
  emitTournamentUpdated(tournament._id.toString(), tournament);
  logger.info(
    `Tournament completed (${formatLabel}): "${tournament.name}" (${tournament._id})${logSuffix}`,
  );
}

export async function advanceRoundRobinTournament(tournament, allMatches, res) {
  const result = roundRobinAdvance(allMatches);
  if (!result.completed) {
    return res.status(400).json({ success: false, message: result.message });
  }
  await completeTournament(tournament, "Round Robin");
  return res
    .status(200)
    .json({ success: true, data: tournament, completed: true });
}

export async function advanceSwissTournament(tournament, allMatches, res) {
  const maxRound = Math.max(...allMatches.map((m) => m.round));
  const currentRoundMatches = allMatches.filter((m) => m.round === maxRound);
  const incomplete = currentRoundMatches.filter(
    (m) => m.status !== "completed",
  );
  if (incomplete.length > 0) {
    return res.status(400).json({
      success: false,
      message: `${incomplete.length} match(es) in round ${maxRound} are not yet completed`,
    });
  }
  // Auto-complete after the standard number of Swiss rounds: ceil(log2(n))
  const n = tournament.participants.length;
  const maxSwissRounds = Math.ceil(Math.log2(Math.max(n, 2)));
  if (maxRound >= maxSwissRounds) {
    await completeTournament(tournament, "Swiss", ` after ${maxRound} rounds`);
    return res
      .status(200)
      .json({ success: true, data: tournament, completed: true });
  }
  const nextRound = maxRound + 1;
  const result = swissAdvance(
    tournament._id,
    tournament.participants,
    allMatches,
    nextRound,
    tournament.enable40kFactions,
  );
  const newMatches = await Match.insertMany(result.docs);
  emitMatchesAppended(tournament._id.toString(), newMatches);
  logger.info(
    `Swiss round ${nextRound} started for tournament ${tournament._id}: ${newMatches.length} matches created`,
  );
  return res
    .status(200)
    .json({ success: true, round: nextRound, matches: newMatches });
}

export async function advanceDoubleEliminationTournament(
  tournament,
  allMatches,
  res,
) {
  // Ensure all matches in the current "active" round(s) are done
  const wbMatches = allMatches.filter((m) => m.bracketSide === "winners");
  const lbMatches = allMatches.filter((m) => m.bracketSide === "losers");
  const gfMatches = allMatches.filter((m) => m.bracketSide === "grand_final");

  const wbMax = wbMatches.length
    ? Math.max(...wbMatches.map((m) => m.round))
    : 0;
  const lbMax = lbMatches.length
    ? Math.max(...lbMatches.map((m) => m.round))
    : 0;

  const wbCurr = wbMatches.filter((m) => m.round === wbMax);
  const lbCurr = lbMatches.filter((m) => m.round === lbMax);
  const gfCurr = gfMatches.length ? [gfMatches[gfMatches.length - 1]] : [];

  const activeCurr = [...wbCurr, ...lbCurr, ...gfCurr];
  const incomplete = activeCurr.filter((m) => m.status !== "completed");
  if (incomplete.length > 0) {
    return res.status(400).json({
      success: false,
      message: `${incomplete.length} match(es) are not yet completed`,
    });
  }

  const result = doubleElimAdvance(tournament._id, allMatches);
  if (result.completed) {
    await completeTournament(tournament, "Double Elimination");
    return res
      .status(200)
      .json({ success: true, data: tournament, completed: true });
  }
  if (result.message && result.docs.length === 0) {
    return res.status(400).json({ success: false, message: result.message });
  }
  const newMatches = await Match.insertMany(result.docs);
  emitMatchesAppended(tournament._id.toString(), newMatches);
  logger.info(
    `Double elimination advanced for tournament ${tournament._id}: ${newMatches.length} new matches`,
  );
  return res.status(200).json({ success: true, matches: newMatches });
}

export async function advanceSingleEliminationTournament(
  tournament,
  allMatches,
  res,
) {
  const maxRound = Math.max(...allMatches.map((m) => m.round));
  const currentRoundMatches = allMatches.filter(
    (m) => m.round === maxRound && m.bracketSide !== "losers",
  );
  const incomplete = currentRoundMatches.filter(
    (m) => m.status !== "completed",
  );
  if (incomplete.length > 0) {
    return res.status(400).json({
      success: false,
      message: `${incomplete.length} match(es) in round ${maxRound} are not yet completed`,
    });
  }

  const result = singleElimAdvance(
    tournament._id,
    currentRoundMatches,
    maxRound + 1,
  );
  if (result.completed) {
    await completeTournament(tournament, "Single Elimination");
    return res
      .status(200)
      .json({ success: true, data: tournament, completed: true });
  }
  const newMatches = await Match.insertMany(result.docs);
  emitMatchesAppended(tournament._id.toString(), newMatches);
  logger.info(
    `Single elimination round ${maxRound + 1} started for tournament ${tournament._id}: ${newMatches.length} matches`,
  );
  return res
    .status(200)
    .json({ success: true, round: maxRound + 1, matches: newMatches });
}
