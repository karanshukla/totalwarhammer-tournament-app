import mongoose from "mongoose";

import Match from "../../../domain/models/match.js";
import Tournament from "../../../domain/models/tournament.js";
import { invalidateStatsCache } from "../../../infrastructure/services/stats-service.js";
import { emitMatchUpdated } from "../../../infrastructure/socket/socket-service.js";
import logger from "../../../infrastructure/utils/logger.js";

const isValidObjectId = (id) => /^[a-f\d]{24}$/i.test(id);
const toObjectId = (id) => new mongoose.Types.ObjectId(id);

// GET /match/tournament/:tournamentId
/** @type {import('express').RequestHandler} */
export const getMatchesByTournament = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.tournamentId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid tournament ID" });
    }
    const matches = await Match.find({
      tournament: toObjectId(req.params.tournamentId),
    }).sort({ round: 1, matchNumber: 1 });
    return res.status(200).json({ success: true, data: matches });
  } catch (error) {
    logger.error(`Get matches error: ${error.message}`, { error });
    return res.status(500).json({
      success: false,
      message: "Failed to fetch matches",
      error: error.message,
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
      error: error.message,
    });
  }
};

// POST /match  (admin creates a match manually)
/** @type {import('express').RequestHandler} */
export const createMatch = async (req, res) => {
  try {
    const { tournamentId, round, matchNumber, player1, player2 } = req.body;

    if (!isValidObjectId(tournamentId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid tournament ID" });
    }

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
      error: error.message,
    });
  }
};

// PATCH /match/:id/report  (participant self-reports their match result)
/** @type {import('express').RequestHandler} */
export const reportResult = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id).populate(
      "tournament",
      "createdBy status participants",
    );
    if (!match) {
      return res
        .status(404)
        .json({ success: false, message: "Match not found" });
    }
    if (match.status === "completed") {
      return res
        .status(400)
        .json({ success: false, message: "Match is already completed" });
    }
    if (match.tournament.status !== "active") {
      return res
        .status(400)
        .json({ success: false, message: "Tournament is not active" });
    }

    const { winnerId } = req.body;
    const player1Id = match.player1.participantId?.toString();
    const player2Id = match.player2.participantId?.toString();
    const winnerIdStr = winnerId?.toString();

    if (winnerIdStr !== player1Id && winnerIdStr !== player2Id) {
      return res.status(400).json({
        success: false,
        message: "Winner must be one of the two players in this match",
      });
    }

    // Identify the reporting participant by matching user id/name to a player slot
    const userId = req.user.id?.toString();
    const userName = req.user.username;
    const tournament = match.tournament;

    const lowerUserName = userName?.trim().toLowerCase();
    // For guests, also check the Guest_XXXX fallback name (first 6 chars of id)
    const guestFallbackName =
      req.user.isGuest && userId
        ? `Guest_${userId.substring(0, 6)}`.toLowerCase()
        : null;
    const nameMatchP1 = (n) => {
      const ln = n.trim().toLowerCase();
      return (
        (lowerUserName && ln === lowerUserName) ||
        (guestFallbackName && ln === guestFallbackName)
      );
    };
    const nameMatchP2 = (n) => {
      const ln = n.trim().toLowerCase();
      return (
        (lowerUserName && ln === lowerUserName) ||
        (guestFallbackName && ln === guestFallbackName)
      );
    };
    const isPlayer1 =
      match.player1.participantId?.toString() === userId ||
      nameMatchP1(match.player1.name) ||
      match.player1.name === userId;
    const isPlayer2 =
      match.player2.participantId?.toString() === userId ||
      nameMatchP2(match.player2.name) ||
      match.player2.name === userId;
    const createdById = tournament.createdBy?._id ?? tournament.createdBy;
    const isCreator = createdById?.toString() === userId;

    if (!isPlayer1 && !isPlayer2 && !isCreator) {
      logger.warn(`Unauthorized result report attempt on match ${match._id} by user ${userId}`);
      return res.status(403).json({
        success: false,
        message:
          "Only players in this match or the tournament creator can report results",
      });
    }

    const reporterParticipantId = isPlayer1
      ? match.player1.participantId
      : isPlayer2
        ? match.player2.participantId
        : null;

    // Remove any prior report from this participant
    if (!match.reportedResults) match.reportedResults = [];
    match.reportedResults = match.reportedResults.filter(
      (r) =>
        r.reportedBy?.toString() !==
        (reporterParticipantId?.toString() ?? userId),
    );

    match.reportedResults.push({
      reportedBy: reporterParticipantId ?? userId,
      reportedByName: userName || userId,
      winnerId,
    });

    // Check for consensus — both players have reported the same winner
    const reports = match.reportedResults;
    if (reports.length >= 2) {
      const allAgree = reports.every(
        (r) => r.winnerId?.toString() === winnerIdStr,
      );
      if (allAgree) {
        const loserId = winnerIdStr === player1Id ? player2Id : player1Id;
        match.winnerId = winnerId;
        match.loserId = loserId;
        match.status = "completed";
        match.completedAt = new Date();
        logger.info(`Match ${match._id} completed by consensus: winner=${winnerIdStr}, reported by ${userName || userId}`);
      } else {
        match.status = "disputed";
        logger.warn(`Match ${match._id} disputed: conflicting reports from ${reports.map((r) => r.reportedByName).join(", ")}`);
      }
    } else {
      match.status = "in_progress";
      logger.debug(`Match ${match._id} result reported by ${userName || userId}: winner=${winnerIdStr} (awaiting other player)`);
    }

    await match.save();
    if (match.status === "completed") invalidateStatsCache().catch(() => {});
    emitMatchUpdated(match.tournament._id.toString(), match);
    return res.status(200).json({ success: true, data: match });
  } catch (error) {
    logger.error(`Report result error: ${error.message}`, { error });
    return res.status(500).json({
      success: false,
      message: "Failed to report result",
      error: error.message,
    });
  }
};

// PATCH /match/:id/resolve  (creator resolves a disputed match)
/** @type {import('express').RequestHandler} */
export const resolveDispute = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id).populate(
      "tournament",
      "createdBy status",
    );
    if (!match) {
      return res
        .status(404)
        .json({ success: false, message: "Match not found" });
    }
    if (match.status !== "disputed") {
      return res
        .status(400)
        .json({ success: false, message: "Match is not disputed" });
    }

    const createdById =
      match.tournament.createdBy?._id ?? match.tournament.createdBy;
    const isCreator = createdById?.toString() === req.user.id?.toString();
    logger.debug(
      `resolveDispute auth: createdById=${createdById?.toString()} req.user.id=${req.user.id} match=${isCreator}`,
    );
    if (!isCreator) {
      return res.status(403).json({
        success: false,
        message: "Only the tournament creator can resolve disputes",
      });
    }

    const { winnerId, reason } = req.body;
    const player1Id = match.player1.participantId?.toString();
    const player2Id = match.player2.participantId?.toString();
    const winnerIdStr = winnerId?.toString();

    if (winnerIdStr !== player1Id && winnerIdStr !== player2Id) {
      return res.status(400).json({
        success: false,
        message: "Winner must be one of the two players in this match",
      });
    }

    const loserId = winnerIdStr === player1Id ? player2Id : player1Id;

    match.resultOverrides.push({
      previousWinnerId: match.winnerId ?? null,
      newWinnerId: winnerId,
      overriddenBy: req.user.id,
      reason: reason || "Dispute resolved by creator",
    });

    match.winnerId = winnerId;
    match.loserId = loserId;
    match.status = "completed";
    match.completedAt = new Date();
    await match.save();
    invalidateStatsCache().catch(() => {});
    emitMatchUpdated(match.tournament._id.toString(), match);

    logger.info(`Dispute resolved on match ${match._id} by user ${req.user.id}: winner=${winnerIdStr}, reason="${reason || "none"}"`);
    return res.status(200).json({ success: true, data: match });
  } catch (error) {
    logger.error(`Resolve dispute error: ${error.message}`, { error });
    return res.status(500).json({
      success: false,
      message: "Failed to resolve dispute",
      error: error.message,
    });
  }
};

// PATCH /match/:id/result  (record match result — tournament admin only)
/** @type {import('express').RequestHandler} */
export const recordResult = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id).populate(
      "tournament",
      "createdBy status",
    );
    if (!match) {
      return res
        .status(404)
        .json({ success: false, message: "Match not found" });
    }

    const createdById =
      match.tournament.createdBy?._id ?? match.tournament.createdBy;
    const isCreator = createdById?.toString() === req.user.id?.toString();
    if (!isCreator) {
      return res.status(403).json({
        success: false,
        message: "Only the tournament admin can record results directly",
      });
    }

    if (match.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "Match is already completed. Use override to change result.",
      });
    }
    if (match.status === "disputed") {
      return res.status(400).json({
        success: false,
        message: "Match is disputed. The tournament creator must resolve it.",
      });
    }
    if (match.tournament.status !== "active") {
      return res
        .status(400)
        .json({ success: false, message: "Tournament is not active" });
    }

    const { winnerId } = req.body;

    const player1Id = match.player1.participantId?.toString();
    const player2Id = match.player2.participantId?.toString();
    const winnerIdStr = winnerId?.toString();

    if (winnerIdStr !== player1Id && winnerIdStr !== player2Id) {
      return res.status(400).json({
        success: false,
        message: "Winner must be one of the two players in this match",
      });
    }

    const loserId = winnerIdStr === player1Id ? player2Id : player1Id;

    match.winnerId = winnerId;
    match.loserId = loserId;
    match.status = "completed";
    match.completedAt = new Date();
    await match.save();
    invalidateStatsCache().catch(() => {});
    emitMatchUpdated(match.tournament._id.toString(), match);

    logger.info(`Match ${match._id} result recorded by admin ${req.user.id}: winner=${winnerIdStr}`);
    return res.status(200).json({ success: true, data: match });
  } catch (error) {
    logger.error(`Record result error: ${error.message}`, { error });
    return res.status(500).json({
      success: false,
      message: "Failed to record result",
      error: error.message,
    });
  }
};

// PATCH /match/:id/override  (tournament admin only)
/** @type {import('express').RequestHandler} */
export const overrideResult = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id).populate(
      "tournament",
      "createdBy status",
    );
    if (!match) {
      return res
        .status(404)
        .json({ success: false, message: "Match not found" });
    }

    const createdById =
      match.tournament.createdBy?._id ?? match.tournament.createdBy;
    const isAdmin = createdById?.toString() === req.user.id?.toString();
    logger.debug(
      `overrideResult auth: createdById=${createdById?.toString()} req.user.id=${req.user.id} match=${isAdmin}`,
    );
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only the tournament admin can override results",
      });
    }

    const { winnerId, reason } = req.body;

    const player1Id = match.player1.participantId?.toString();
    const player2Id = match.player2.participantId?.toString();
    const winnerIdStr = winnerId?.toString();

    if (winnerIdStr !== player1Id && winnerIdStr !== player2Id) {
      return res.status(400).json({
        success: false,
        message: "Winner must be one of the two players in this match",
      });
    }

    const loserId = winnerIdStr === player1Id ? player2Id : player1Id;

    match.resultOverrides.push({
      previousWinnerId: match.winnerId ?? null,
      newWinnerId: winnerId,
      overriddenBy: req.user.id,
      reason: reason || "",
    });

    const previousWinner = match.winnerId?.toString() ?? "none";
    match.winnerId = winnerId;
    match.loserId = loserId;
    match.status = "completed";
    match.completedAt = match.completedAt ?? new Date();
    await match.save();
    invalidateStatsCache().catch(() => {});
    emitMatchUpdated(match.tournament._id.toString(), match);

    logger.warn(`Match ${match._id} result overridden by admin ${req.user.id}: ${previousWinner} → ${winnerIdStr}, reason="${reason || "none"}"`);
    return res.status(200).json({ success: true, data: match });
  } catch (error) {
    logger.error(`Override result error: ${error.message}`, { error });
    return res.status(500).json({
      success: false,
      message: "Failed to override result",
      error: error.message,
    });
  }
};

// PATCH /match/:id/status  (admin sets match to in_progress)
/** @type {import('express').RequestHandler} */
export const updateMatchStatus = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id).populate(
      "tournament",
      "createdBy status",
    );
    if (!match) {
      return res
        .status(404)
        .json({ success: false, message: "Match not found" });
    }

    const isAdmin =
      match.tournament.createdBy?.toString() === req.user.id?.toString();
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only the tournament admin can update match status",
      });
    }

    const { status } = req.body;
    if (!["pending", "in_progress"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be pending or in_progress",
      });
    }

    match.status = status;
    await match.save();
    emitMatchUpdated(match.tournament._id.toString(), match);

    return res.status(200).json({ success: true, data: match });
  } catch (error) {
    logger.error(`Update match status error: ${error.message}`, { error });
    return res.status(500).json({
      success: false,
      message: "Failed to update match status",
      error: error.message,
    });
  }
};
