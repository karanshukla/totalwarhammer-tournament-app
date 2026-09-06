import mongoose from "mongoose";

import Match from "../../../domain/models/match.js";
import Tournament from "../../../domain/models/tournament.js";
import logger from "../../../infrastructure/utils/logger.js";

export {
  reportResult,
  resolveDispute,
  recordResult,
  overrideResult,
  updateMatchStatus,
} from "./match-result-controller.js";

const toObjectId = (id) => new mongoose.Types.ObjectId(id);

// GET /match/tournament/:tournamentId
/** @type {import('express').RequestHandler} */
export const getMatchesByTournament = async (req, res) => {
  try {
    const matches = await Match.find({
      tournament: toObjectId(req.params.tournamentId),
    }).sort({ round: 1, matchNumber: 1 });
    return res.status(200).json({ success: true, data: matches });
  } catch (error) {
    logger.error(`Get matches error: ${error.message}`, { error });
    return res.status(500).json({
      success: false,
      message: "Failed to fetch matches",
    });
  }
};

// GET /match/:id
/** @type {import('express').RequestHandler} */
export const getMatchById = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) {
      return res
        .status(404)
        .json({ success: false, message: "Match not found" });
    }
    return res.status(200).json({ success: true, data: match });
  } catch (error) {
    logger.error(`Get match error: ${error.message}`, { error });
    return res.status(500).json({
      success: false,
      message: "Failed to fetch match",
    });
  }
};

// POST /match  (admin creates a match manually)
/** @type {import('express').RequestHandler} */
export const createMatch = async (req, res) => {
  try {
    const { tournamentId, round, matchNumber, player1, player2 } = req.body;

    const tournament = await Tournament.findOne({
      _id: toObjectId(tournamentId),
      createdBy: req.user.id,
    });
    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: "Tournament not found or access denied",
      });
    }
    if (tournament.status === "pending") {
      return res.status(400).json({
        success: false,
        message: "Tournament must be started before creating matches",
      });
    }

    const participantIds = new Set(
      tournament.participants.map((p) => p._id.toString()),
    );
    const unknownSlot = [player1, player2].find(
      (slot) =>
        slot.participantId &&
        !participantIds.has(slot.participantId.toString()),
    );
    if (unknownSlot) {
      return res.status(400).json({
        success: false,
        message: "Both players must be participants in this tournament",
      });
    }

    const match = await Match.create({
      tournament: tournamentId,
      round,
      matchNumber,
      player1,
      player2,
    });

    return res.status(201).json({ success: true, data: match });
  } catch (error) {
    logger.error(`Create match error: ${error.message}`, { error });
    return res.status(500).json({
      success: false,
      message: "Failed to create match",
    });
  }
};
