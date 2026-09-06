import Tournament from "../../../domain/models/tournament.js";
import { factionRejectionReason } from "../../../domain/services/faction-eligibility-service.js";
import { emitTournamentUpdated } from "../../../infrastructure/socket/socket-service.js";
import logger from "../../../infrastructure/utils/logger.js";

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
    const rejection = factionRejectionReason(tournament, faction);
    if (rejection) {
      return res.status(400).json({ success: false, message: rejection });
    }
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
    const rejection = factionRejectionReason(tournament, faction);
    if (rejection) {
      return res.status(400).json({ success: false, message: rejection });
    }
    if (name !== undefined) participant.name = name;
    if (faction !== undefined) participant.faction = faction;
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
    const rejection = factionRejectionReason(tournament, faction);
    if (rejection) {
      return res.status(400).json({ success: false, message: rejection });
    }
    const playerName =
      req.user.username || `Guest_${req.user.id.substring(0, 6)}`;
    const alreadyJoined = req.user.isGuest
      ? tournament.participants.some(
          (p) => p.guestId === req.user.id || p.name === playerName,
        )
      : tournament.participants.some(
          (p) =>
            (p.userId && p.userId.toString() === req.user.id) ||
            (!p.userId && p.name === playerName),
        );
    if (alreadyJoined) {
      return res.status(400).json({
        success: false,
        message: "You have already joined this tournament",
      });
    }

    // The checks above give the caller a specific message, but they are read
    // from a snapshot. Re-assert capacity, status and non-duplication as
    // conditions on the write itself, so two simultaneous joins on the last
    // slot cannot both succeed.
    const identityCondition = req.user.isGuest
      ? { "participants.guestId": { $ne: req.user.id } }
      : { "participants.userId": { $ne: req.user.id } };
    const joined = await Tournament.findOneAndUpdate(
      {
        _id: req.params.id,
        status: "pending",
        $expr: { $lt: [{ $size: "$participants" }, "$playerCount"] },
        "participants.name": { $ne: playerName },
        ...identityCondition,
      },
      {
        $push: {
          participants: {
            userId: req.user.isGuest ? null : req.user.id,
            guestId: req.user.isGuest ? req.user.id : null,
            name: playerName,
            faction: faction || "",
          },
        },
      },
      { new: true },
    );
    if (!joined) {
      return res.status(409).json({
        success: false,
        message: "Could not join — the tournament filled up or already started",
      });
    }
    emitTournamentUpdated(joined._id.toString(), joined);
    logger.info(
      `User "${playerName}" (${req.user.id}) joined tournament ${joined._id} with faction "${faction || "none"}"`,
    );
    return res.status(200).json({ success: true, data: joined });
  } catch (error) {
    logger.error(`Join tournament error: ${error.message}`, { error });
    return res.status(500).json({
      success: false,
      message: "Failed to join tournament",
    });
  }
};
