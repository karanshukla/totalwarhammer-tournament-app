import Match from "../../../domain/models/match.js";
import Tournament from "../../../domain/models/tournament.js";
import {
  singleElimStart,
  doubleElimStart,
  roundRobinStart,
  swissStart,
} from "../../../domain/services/tournament-service.js";
import {
  emitTournamentUpdated,
  emitMatchesUpdated,
} from "../../../infrastructure/socket/socket-service.js";
import logger from "../../../infrastructure/utils/logger.js";

import {
  advanceRoundRobinTournament,
  advanceSwissTournament,
  advanceDoubleEliminationTournament,
  advanceSingleEliminationTournament,
} from "./tournament-bracket-controller-helpers.js";

/** @type {import('express').RequestHandler} */
export const startTournament = async (req, res) => {
  try {
    const tournament = await Tournament.findOne({
      _id: req.params.id,
      createdBy: req.user.id,
    });
    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: "Tournament not found or access denied",
      });
    }
    if (tournament.status !== "pending") {
      return res
        .status(400)
        .json({ success: false, message: "Tournament has already started" });
    }
    if (tournament.participants.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Need at least 2 participants to start",
      });
    }

    // Claim the tournament atomically so a double-click can't have both
    // requests generate a bracket. The loser sees 409 rather than a duplicate
    // key 500 from the unique match index.
    const started = await Tournament.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.id, status: "pending" },
      { $set: { status: "active" } },
      { new: true },
    );
    if (!started) {
      return res
        .status(409)
        .json({ success: false, message: "Tournament has already started" });
    }

    const {
      tournamentType,
      _id: tId,
      participants,
      enable40kFactions,
    } = started;

    const bracketBuilders = {
      "Single Elimination": singleElimStart,
      "Double Elimination": doubleElimStart,
      "Round Robin": roundRobinStart,
      "Swiss System": swissStart,
    };
    const buildBracket = bracketBuilders[tournamentType] ?? singleElimStart;

    let matches;
    try {
      matches = await Match.insertMany(
        buildBracket(tId, participants, enable40kFactions),
      );
    } catch (error) {
      // Without this the tournament is stranded: active with no matches, so it
      // can no longer be started, advanced, or deleted.
      await Tournament.updateOne(
        { _id: tId, status: "active" },
        { $set: { status: "pending" } },
      );
      throw error;
    }

    emitTournamentUpdated(tId.toString(), started);
    emitMatchesUpdated(tId.toString(), matches);
    logger.info(
      `Tournament started: "${started.name}" (${tId}) type=${tournamentType} participants=${participants.length} matches=${matches.length}`,
    );
    return res.status(200).json({ success: true, data: started, matches });
  } catch (error) {
    logger.error(`Start tournament error: ${error.message}`, { error });
    return res.status(500).json({
      success: false,
      message: "Failed to start tournament",
    });
  }
};

/** @type {import('express').RequestHandler} */
export const advanceRound = async (req, res) => {
  try {
    const tournament = await Tournament.findOne({
      _id: req.params.id,
      createdBy: req.user.id,
    });
    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: "Tournament not found or access denied",
      });
    }
    if (tournament.status !== "active") {
      return res
        .status(400)
        .json({ success: false, message: "Tournament is not active" });
    }

    const allMatches = await Match.find({ tournament: tournament._id }).sort({
      round: 1,
      matchNumber: 1,
    });
    if (!allMatches.length) {
      return res
        .status(400)
        .json({ success: false, message: "No matches found" });
    }

    const { tournamentType } = tournament;

    if (tournamentType === "Round Robin") {
      return await advanceRoundRobinTournament(tournament, allMatches, res);
    }
    if (tournamentType === "Swiss System") {
      return await advanceSwissTournament(tournament, allMatches, res);
    }
    if (tournamentType === "Double Elimination") {
      return await advanceDoubleEliminationTournament(
        tournament,
        allMatches,
        res,
      );
    }
    // Single Elimination is the default for any other/unrecognized type
    return await advanceSingleEliminationTournament(
      tournament,
      allMatches,
      res,
    );
  } catch (error) {
    if (error?.code === 11000) {
      logger.warn(
        `Advance round rejected as duplicate for tournament ${req.params.id}`,
      );
      return res
        .status(409)
        .json({ success: false, message: "Round has already been advanced" });
    }
    logger.error(`Advance round error: ${error.message}`, { error });
    return res.status(500).json({
      success: false,
      message: "Failed to advance round",
    });
  }
};
