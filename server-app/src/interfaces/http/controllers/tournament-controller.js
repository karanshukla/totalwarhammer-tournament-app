import mongoose from "mongoose";

import Match from "../../../domain/models/match.js";
import Tournament from "../../../domain/models/tournament.js";
import {
  singleElimStart,
  singleElimAdvance,
  doubleElimStart,
  doubleElimAdvance,
  roundRobinStart,
  roundRobinAdvance,
  swissStart,
  swissAdvance,
} from "../../../domain/services/tournament-service.js";
import { invalidateStatsCache } from "../../../infrastructure/services/stats-service.js";
import {
  emitTournamentUpdated,
  emitMatchesUpdated,
  emitMatchesAppended,
} from "../../../infrastructure/socket/socket-service.js";
import logger from "../../../infrastructure/utils/logger.js";

const isValidObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(id) && /^[a-f\d]{24}$/i.test(id);

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function ensureCode(tournament) {
  if (tournament && !tournament.code) {
    const newCode = generateCode();
    const updated = await Tournament.findOneAndUpdate(
      {
        _id: tournament._id,
        $or: [{ code: { $exists: false } }, { code: null }, { code: "" }],
      },
      { $set: { code: newCode } },
      { new: true },
    );
    if (updated) return updated;
    // Another request already set the code — re-fetch to get it
    return (await Tournament.findById(tournament._id)) || tournament;
  }
  return tournament;
}

/** @type {import('express').RequestHandler} */
export const createTournament = async (req, res) => {
  try {
    // Only registered users can create tournaments
    if (req.user.isGuest) {
      return res.status(403).json({
        success: false,
        message:
          "Guest users cannot create tournaments. Please sign up to create tournaments.",
      });
    }

    const {
      name,
      description,
      playerCount,
      tournamentType,
      bannedFactions,
      enable40kFactions,
    } = req.body;

    if (description && description.length > 2000) {
      return res.status(400).json({
        success: false,
        message: "Description cannot exceed 2000 characters",
      });
    }

    const tournament = await Tournament.create({
      name,
      description: description || "",
      playerCount,
      tournamentType,
      bannedFactions: bannedFactions || [],
      enable40kFactions: !!enable40kFactions,
      createdBy: req.user.id,
      code: generateCode(),
      participants: [
        { name: req.user.username || "Tournament Creator", faction: "" },
      ],
    });

    logger.info(
      `Tournament created: "${tournament.name}" (${tournament._id}) type=${tournamentType} slots=${playerCount} by user=${req.user.id}`,
    );
    return res.status(201).json({
      success: true,
      message: "Tournament created successfully",
      data: tournament,
    });
  } catch (error) {
    logger.error(`Create tournament error: ${error.message}`, { error });
    return res.status(500).json({
      success: false,
      message: "Failed to create tournament",
    });
  }
};

/** @type {import('express').RequestHandler} */
export const getTournaments = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) {
      const statuses = status
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      filter.status = statuses.length === 1 ? statuses[0] : { $in: statuses };
    }

    const tournaments = await Tournament.find(filter)
      .populate("createdBy", "username")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: tournaments,
    });
  } catch (error) {
    logger.error(`Get tournaments error: ${error.message}`, { error });
    return res.status(500).json({
      success: false,
      message: "Failed to fetch tournaments",
    });
  }
};

/** @type {import('express').RequestHandler} */
export const getUserTournaments = async (req, res) => {
  try {
    const userId = req.user.id;
    const userName = req.user.username;
    const isGuest = req.user.isGuest;

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 9));
    const allowedStatuses = new Set(["all", "pending", "active", "completed"]);
    const rawStatus = req.query.status;
    const status =
      typeof rawStatus === "string" && allowedStatuses.has(rawStatus)
        ? rawStatus
        : "all";
    const skip = (page - 1) * limit;

    const possibleNames = [userId];
    if (userName && userName !== userId) {
      possibleNames.push(userName);
    }

    const queryConditions = [];
    if (!isGuest) {
      queryConditions.push({ createdBy: userId });
    }
    queryConditions.push({ "participants.name": { $in: possibleNames } });

    const baseQuery = { $or: queryConditions };
    const filter =
      status && status !== "all" ? { ...baseQuery, status } : baseQuery;

    const [tournaments, statusAgg] = await Promise.all([
      Tournament.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Tournament.aggregate([
        { $match: baseQuery },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    const statusCounts = { all: 0, pending: 0, active: 0, completed: 0 };
    for (const { _id, count } of statusAgg) {
      if (_id in statusCounts) statusCounts[_id] = count;
      statusCounts.all += count;
    }

    const total =
      status && status !== "all"
        ? (statusCounts[status] ?? 0)
        : statusCounts.all;

    const withCodes = await Promise.all(tournaments.map(ensureCode));
    return res.status(200).json({
      success: true,
      data: withCodes,
      total,
      page,
      limit,
      statusCounts,
    });
  } catch (error) {
    logger.error(`Get user tournaments error: ${error.message}`, { error });
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user tournaments",
    });
  }
};

/** @type {import('express').RequestHandler} */
export const getTournamentById = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid tournament ID" });
    }
    const found = await Tournament.findById(req.params.id);
    if (!found) {
      return res
        .status(404)
        .json({ success: false, message: "Tournament not found" });
    }
    const tournament = await ensureCode(found);
    return res.status(200).json({ success: true, data: tournament });
  } catch (error) {
    logger.error(`Get tournament error: ${error.message}`, { error });
    return res.status(500).json({
      success: false,
      message: "Failed to fetch tournament",
    });
  }
};

/** @type {import('express').RequestHandler} */
export const getTournamentByCode = async (req, res) => {
  try {
    const tournament = await Tournament.findOne({
      code: req.params.code.toUpperCase(),
    });
    if (!tournament) {
      return res
        .status(404)
        .json({ success: false, message: "Tournament not found" });
    }
    return res.status(200).json({ success: true, data: tournament });
    // Note: code already exists by definition (queried by code), no ensureCode needed
  } catch (error) {
    logger.error(`Get tournament by code error: ${error.message}`, { error });
    return res.status(500).json({
      success: false,
      message: "Failed to fetch tournament",
    });
  }
};

/** @type {import('express').RequestHandler} */
export const addParticipant = async (req, res) => {
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
      return res.status(400).json({
        success: false,
        message: "Cannot add participants to a started tournament",
      });
    }
    if (tournament.participants.length >= tournament.playerCount) {
      return res.status(400).json({
        success: false,
        message: `Tournament is full (max ${tournament.playerCount} players)`,
      });
    }
    const { name, faction } = req.body;
    tournament.participants.push({ name, faction: faction || "" });
    await tournament.save();
    emitTournamentUpdated(tournament._id.toString(), tournament);
    logger.info(
      `Participant added to tournament ${tournament._id}: "${name}" (faction: ${faction || "none"})`,
    );
    return res.status(200).json({ success: true, data: tournament });
  } catch (error) {
    logger.error(`Add participant error: ${error.message}`, { error });
    return res.status(500).json({
      success: false,
      message: "Failed to add participant",
    });
  }
};

/** @type {import('express').RequestHandler} */
export const removeParticipant = async (req, res) => {
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
      return res.status(400).json({
        success: false,
        message: "Cannot remove participants from a started tournament",
      });
    }
    const participantIndex = tournament.participants.findIndex(
      (p) => p._id.toString() === req.params.participantId,
    );
    if (participantIndex === -1) {
      return res
        .status(404)
        .json({ success: false, message: "Participant not found" });
    }
    const removedName = tournament.participants[participantIndex].name;
    tournament.participants.splice(participantIndex, 1);
    await tournament.save();
    emitTournamentUpdated(tournament._id.toString(), tournament);
    logger.info(
      `Participant removed from tournament ${tournament._id}: "${removedName}"`,
    );
    return res.status(200).json({ success: true, data: tournament });
  } catch (error) {
    logger.error(`Remove participant error: ${error.message}`, { error });
    return res.status(500).json({
      success: false,
      message: "Failed to remove participant",
    });
  }
};

/** @type {import('express').RequestHandler} */
export const updateParticipant = async (req, res) => {
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
    const participant = tournament.participants.id(req.params.participantId);
    if (!participant) {
      return res
        .status(404)
        .json({ success: false, message: "Participant not found" });
    }
    const { name, faction } = req.body;
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0 || name.length > 100) {
        return res.status(400).json({ success: false, message: "Name must be between 1 and 100 characters" });
      }
      participant.name = name.trim();
    }
    if (faction !== undefined) {
      if (typeof faction !== "string" || faction.length > 100) {
        return res.status(400).json({ success: false, message: "Faction must be at most 100 characters" });
      }
      participant.faction = faction;
    }
    await tournament.save();
    emitTournamentUpdated(tournament._id.toString(), tournament);
    return res.status(200).json({ success: true, data: tournament });
  } catch (error) {
    logger.error(`Update participant error: ${error.message}`, { error });
    return res.status(500).json({
      success: false,
      message: "Failed to update participant",
    });
  }
};

/** @type {import('express').RequestHandler} */
export const joinTournament = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res
        .status(404)
        .json({ success: false, message: "Tournament not found" });
    }
    if (tournament.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Tournament is no longer open for registration",
      });
    }
    if (tournament.participants.length >= tournament.playerCount) {
      return res.status(400).json({
        success: false,
        message: `Tournament is full (max ${tournament.playerCount} players)`,
      });
    }
    const { faction } = req.body;
    const playerName =
      req.user.username || `Guest_${req.user.id.substring(0, 6)}`;
    const alreadyJoined = tournament.participants.some(
      (p) => p.name === playerName,
    );
    if (alreadyJoined) {
      return res.status(400).json({
        success: false,
        message: "You have already joined this tournament",
      });
    }
    tournament.participants.push({ name: playerName, faction: faction || "" });
    await tournament.save();
    emitTournamentUpdated(tournament._id.toString(), tournament);
    logger.info(
      `User "${playerName}" (${req.user.id}) joined tournament ${tournament._id} with faction "${faction || "none"}"`,
    );
    return res.status(200).json({ success: true, data: tournament });
  } catch (error) {
    logger.error(`Join tournament error: ${error.message}`, { error });
    return res.status(500).json({
      success: false,
      message: "Failed to join tournament",
    });
  }
};

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

    tournament.status = "active";
    await tournament.save();

    let matchDocs;
    const {
      tournamentType,
      _id: tId,
      participants,
      enable40kFactions,
    } = tournament;

    switch (tournamentType) {
      case "Single Elimination":
        matchDocs = singleElimStart(tId, participants, enable40kFactions);
        break;
      case "Double Elimination":
        matchDocs = doubleElimStart(tId, participants, enable40kFactions);
        break;
      case "Round Robin":
        matchDocs = roundRobinStart(tId, participants, enable40kFactions);
        break;
      case "Swiss System":
        matchDocs = swissStart(tId, participants, enable40kFactions);
        break;
      default:
        matchDocs = singleElimStart(tId, participants, enable40kFactions);
    }

    const matches = await Match.insertMany(matchDocs);
    emitTournamentUpdated(tId.toString(), tournament);
    emitMatchesUpdated(tId.toString(), matches);
    logger.info(
      `Tournament started: "${tournament.name}" (${tId}) type=${tournamentType} participants=${participants.length} matches=${matches.length}`,
    );
    return res.status(200).json({ success: true, data: tournament, matches });
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
    });
    if (!allMatches.length) {
      return res
        .status(400)
        .json({ success: false, message: "No matches found" });
    }

    const { tournamentType } = tournament;

    // ── Round Robin ────────────────────────────────────────────────────────
    if (tournamentType === "Round Robin") {
      const result = roundRobinAdvance(allMatches);
      if (!result.completed) {
        return res
          .status(400)
          .json({ success: false, message: result.message });
      }
      tournament.status = "completed";
      await tournament.save();
      invalidateStatsCache().catch(() => {});
      emitTournamentUpdated(tournament._id.toString(), tournament);
      logger.info(
        `Tournament completed (Round Robin): "${tournament.name}" (${tournament._id})`,
      );
      return res
        .status(200)
        .json({ success: true, data: tournament, completed: true });
    }

    // ── Swiss System ───────────────────────────────────────────────────────
    if (tournamentType === "Swiss System") {
      const maxRound = Math.max(...allMatches.map((m) => m.round));
      const currentRoundMatches = allMatches.filter(
        (m) => m.round === maxRound,
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
      // Auto-complete after the standard number of Swiss rounds: ceil(log2(n))
      const n = tournament.participants.length;
      const maxSwissRounds = Math.ceil(Math.log2(Math.max(n, 2)));
      if (maxRound >= maxSwissRounds) {
        tournament.status = "completed";
        await tournament.save();
        invalidateStatsCache().catch(() => {});
        emitTournamentUpdated(tournament._id.toString(), tournament);
        logger.info(
          `Tournament completed (Swiss): "${tournament.name}" (${tournament._id}) after ${maxRound} rounds`,
        );
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

    // ── Double Elimination ─────────────────────────────────────────────────
    if (tournamentType === "Double Elimination") {
      // Ensure all matches in the current "active" round(s) are done
      const wbMatches = allMatches.filter((m) => m.bracketSide === "winners");
      const lbMatches = allMatches.filter((m) => m.bracketSide === "losers");
      const gfMatches = allMatches.filter(
        (m) => m.bracketSide === "grand_final",
      );

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
        tournament.status = "completed";
        await tournament.save();
        invalidateStatsCache().catch(() => {});
        emitTournamentUpdated(tournament._id.toString(), tournament);
        logger.info(
          `Tournament completed (Double Elimination): "${tournament.name}" (${tournament._id})`,
        );
        return res
          .status(200)
          .json({ success: true, data: tournament, completed: true });
      }
      if (result.message && result.docs.length === 0) {
        return res
          .status(400)
          .json({ success: false, message: result.message });
      }
      const newMatches = await Match.insertMany(result.docs);
      emitMatchesAppended(tournament._id.toString(), newMatches);
      logger.info(
        `Double elimination advanced for tournament ${tournament._id}: ${newMatches.length} new matches`,
      );
      return res.status(200).json({ success: true, matches: newMatches });
    }

    // ── Single Elimination (default) ───────────────────────────────────────
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
      tournament.status = "completed";
      await tournament.save();
      invalidateStatsCache().catch(() => {});
      emitTournamentUpdated(tournament._id.toString(), tournament);
      logger.info(
        `Tournament completed (Single Elimination): "${tournament.name}" (${tournament._id})`,
      );
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
  } catch (error) {
    logger.error(`Advance round error: ${error.message}`, { error });
    return res.status(500).json({
      success: false,
      message: "Failed to advance round",
    });
  }
};

/** @type {import('express').RequestHandler} */
export const updateDescription = async (req, res) => {
  try {
    const { id } = req.params;
    const { description } = req.body;

    if (typeof description !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "Description must be a string" });
    }

    if (description.length > 2000) {
      return res.status(400).json({
        success: false,
        message: "Description cannot exceed 2000 characters",
      });
    }

    const tournament = await Tournament.findOne({
      _id: id,
      createdBy: req.user.id,
    });
    if (!tournament) {
      return res.status(404).json({
        success: false,
        message:
          "Tournament not found or you do not have permission to edit it",
      });
    }

    tournament.description = description;
    await tournament.save();

    return res.status(200).json({
      success: true,
      message: "Description updated",
      data: tournament,
    });
  } catch (error) {
    logger.error(`Update description error: ${error.message}`, { error });
    return res.status(500).json({
      success: false,
      message: "Failed to update description",
    });
  }
};

/** @type {import('express').RequestHandler} */
export const deleteTournament = async (req, res) => {
  try {
    const { id } = req.params;

    const tournament = await Tournament.findOne({
      _id: id,
      createdBy: req.user.id,
    });
    if (!tournament) {
      return res.status(404).json({
        success: false,
        message:
          "Tournament not found or you do not have permission to delete it",
      });
    }

    if (tournament.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Cannot delete a tournament that has already started",
      });
    }

    await tournament.deleteOne();

    logger.info(
      `Tournament deleted: "${tournament.name}" (${id}) by user=${req.user.id}`,
    );
    return res.status(200).json({
      success: true,
      message: "Tournament deleted successfully",
    });
  } catch (error) {
    logger.error(`Delete tournament error: ${error.message}`, { error });
    return res.status(500).json({
      success: false,
      message: "Failed to delete tournament",
    });
  }
};
