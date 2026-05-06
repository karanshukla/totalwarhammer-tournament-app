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
import logger from "../../../infrastructure/utils/logger.js";

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

    const { name, description, playerCount, tournamentType, bannedFactions } =
      req.body;

    const tournament = await Tournament.create({
      name,
      description: description || "",
      playerCount,
      tournamentType,
      bannedFactions: bannedFactions || [],
      createdBy: req.user.id,
      code: generateCode(),
      participants: [
        { name: req.user.username || "Tournament Creator", faction: "" },
      ],
    });

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
      error: error.message,
    });
  }
};

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
      error: error.message,
    });
  }
};

export const getUserTournaments = async (req, res) => {
  try {
    const userId = req.user.id;
    const userName = req.user.username;
    const isGuest = req.user.isGuest;

    // Build list of possible names the user might be stored as
    const possibleNames = [userId];
    if (userName && userName !== userId) {
      possibleNames.push(userName);
    }

    // Build query conditions
    const queryConditions = [];

    // Only check createdBy for non-guest users (guest IDs are UUIDs, not ObjectIds)
    if (!isGuest) {
      queryConditions.push({ createdBy: userId });
    }

    // Always check participants (works for both guests and registered users)
    queryConditions.push({ "participants.name": { $in: possibleNames } });

    const tournaments = await Tournament.find({
      $or: queryConditions,
    }).sort({ createdAt: -1 });

    const withCodes = await Promise.all(tournaments.map(ensureCode));
    return res.status(200).json({ success: true, data: withCodes });
  } catch (error) {
    logger.error(`Get user tournaments error: ${error.message}`, { error });
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user tournaments",
      error: error.message,
    });
  }
};

export const getTournamentById = async (req, res) => {
  try {
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
      error: error.message,
    });
  }
};

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
      error: error.message,
    });
  }
};

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
    return res.status(200).json({ success: true, data: tournament });
  } catch (error) {
    logger.error(`Add participant error: ${error.message}`, { error });
    return res.status(500).json({
      success: false,
      message: "Failed to add participant",
      error: error.message,
    });
  }
};

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
    tournament.participants.splice(participantIndex, 1);
    await tournament.save();
    return res.status(200).json({ success: true, data: tournament });
  } catch (error) {
    logger.error(`Remove participant error: ${error.message}`, { error });
    return res.status(500).json({
      success: false,
      message: "Failed to remove participant",
      error: error.message,
    });
  }
};

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
    if (name !== undefined) participant.name = name;
    if (faction !== undefined) participant.faction = faction;
    await tournament.save();
    return res.status(200).json({ success: true, data: tournament });
  } catch (error) {
    logger.error(`Update participant error: ${error.message}`, { error });
    return res.status(500).json({
      success: false,
      message: "Failed to update participant",
      error: error.message,
    });
  }
};

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
    return res.status(200).json({ success: true, data: tournament });
  } catch (error) {
    logger.error(`Join tournament error: ${error.message}`, { error });
    return res.status(500).json({
      success: false,
      message: "Failed to join tournament",
      error: error.message,
    });
  }
};

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
    const { tournamentType, _id: tId, participants } = tournament;

    switch (tournamentType) {
      case "Single Elimination":
        matchDocs = singleElimStart(tId, participants);
        break;
      case "Double Elimination":
        matchDocs = doubleElimStart(tId, participants);
        break;
      case "Round Robin":
        matchDocs = roundRobinStart(tId, participants);
        break;
      case "Swiss System":
        matchDocs = swissStart(tId, participants);
        break;
      default:
        matchDocs = singleElimStart(tId, participants);
    }

    const matches = await Match.insertMany(matchDocs);
    return res.status(200).json({ success: true, data: tournament, matches });
  } catch (error) {
    logger.error(`Start tournament error: ${error.message}`, { error });
    return res.status(500).json({
      success: false,
      message: "Failed to start tournament",
      error: error.message,
    });
  }
};

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
      return res
        .status(200)
        .json({ success: true, data: tournament, completed: true });
    }
    const newMatches = await Match.insertMany(result.docs);
    return res
      .status(200)
      .json({ success: true, round: maxRound + 1, matches: newMatches });
  } catch (error) {
    logger.error(`Advance round error: ${error.message}`, { error });
    return res.status(500).json({
      success: false,
      message: "Failed to advance round",
      error: error.message,
    });
  }
};

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

    return res.status(200).json({
      success: true,
      message: "Tournament deleted successfully",
    });
  } catch (error) {
    logger.error(`Delete tournament error: ${error.message}`, { error });
    return res.status(500).json({
      success: false,
      message: "Failed to delete tournament",
      error: error.message,
    });
  }
};
