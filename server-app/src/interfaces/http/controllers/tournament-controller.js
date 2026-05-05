import Match from "../../../domain/models/match.js";
import Tournament from "../../../domain/models/tournament.js";
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
    if (status) filter.status = status;

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
    const playerName = req.user.username || req.user.id;
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

    // Auto-generate round 1 matches
    const participants = [...tournament.participants];
    // Shuffle for elimination formats, keep order for round-robin/swiss
    if (
      ["Single Elimination", "Double Elimination"].includes(
        tournament.tournamentType,
      )
    ) {
      for (let i = participants.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [participants[i], participants[j]] = [participants[j], participants[i]];
      }
    }

    const matchDocs = [];
    let matchNumber = 1;
    for (let i = 0; i + 1 < participants.length; i += 2) {
      const p1 = participants[i];
      const p2 = participants[i + 1];
      matchDocs.push({
        tournament: tournament._id,
        round: 1,
        matchNumber: matchNumber++,
        player1: { participantId: p1._id, name: p1.name, faction: p1.faction },
        player2: { participantId: p2._id, name: p2.name, faction: p2.faction },
      });
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

    // Find the highest completed round
    const allMatches = await Match.find({ tournament: tournament._id }).sort({
      round: 1,
    });
    if (!allMatches.length) {
      return res
        .status(400)
        .json({ success: false, message: "No matches found" });
    }

    const maxRound = Math.max(...allMatches.map((m) => m.round));
    const currentRoundMatches = allMatches.filter((m) => m.round === maxRound);

    // All matches in current round must be completed
    const incomplete = currentRoundMatches.filter(
      (m) => m.status !== "completed",
    );
    if (incomplete.length > 0) {
      return res.status(400).json({
        success: false,
        message: `${incomplete.length} match(es) in round ${maxRound} are not yet completed`,
      });
    }

    // Collect winners from current round
    const winners = currentRoundMatches.map((m) => {
      const winnerId = m.winnerId?.toString();
      const p =
        winnerId === m.player1.participantId?.toString()
          ? m.player1
          : m.player2;
      return p;
    });

    // If only one winner → tournament is over
    if (winners.length === 1) {
      tournament.status = "completed";
      await tournament.save();
      return res
        .status(200)
        .json({ success: true, data: tournament, completed: true });
    }

    // Generate next round matches
    const nextRound = maxRound + 1;
    const matchDocs = [];
    let matchNumber = 1;
    for (let i = 0; i + 1 < winners.length; i += 2) {
      const p1 = winners[i];
      const p2 = winners[i + 1];
      matchDocs.push({
        tournament: tournament._id,
        round: nextRound,
        matchNumber: matchNumber++,
        player1: {
          participantId: p1.participantId,
          name: p1.name,
          faction: p1.faction,
        },
        player2: {
          participantId: p2.participantId,
          name: p2.name,
          faction: p2.faction,
        },
      });
    }

    // If odd winner count (bye), carry the last winner to next round automatically
    if (winners.length % 2 !== 0) {
      const bye = winners[winners.length - 1];
      matchDocs.push({
        tournament: tournament._id,
        round: nextRound,
        matchNumber: matchNumber++,
        player1: {
          participantId: bye.participantId,
          name: bye.name,
          faction: bye.faction,
        },
        player2: {
          participantId: bye.participantId,
          name: `${bye.name} (BYE)`,
          faction: bye.faction,
        },
        winnerId: bye.participantId,
        loserId: bye.participantId,
        status: "completed",
        completedAt: new Date(),
      });
    }

    const newMatches = await Match.insertMany(matchDocs);
    return res
      .status(200)
      .json({ success: true, round: nextRound, matches: newMatches });
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
