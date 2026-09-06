import mongoose from "mongoose";

import Tournament from "../../../domain/models/tournament.js";
import { emitTournamentUpdated } from "../../../infrastructure/socket/socket-service.js";
import logger from "../../../infrastructure/utils/logger.js";

import {
  isValidObjectId,
  ensureCode,
  createWithUniqueCode,
} from "./tournament-code-helpers.js";

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

    const tournament = await createWithUniqueCode({
      name,
      description: description || "",
      playerCount,
      tournamentType,
      bannedFactions: bannedFactions || [],
      enable40kFactions: !!enable40kFactions,
      createdBy: req.user.id,
      participants: [
        {
          userId: req.user.id,
          name: req.user.username || "Tournament Creator",
          faction: "",
        },
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
    // Optional game-system filter: "wh3" (exclude 40k), "40k" (only 40k),
    // or anything else / omitted (all games).
    const game = typeof req.query.game === "string" ? req.query.game : "all";
    const enable40kCondition =
      game === "wh3"
        ? { enable40kFactions: { $ne: true } }
        : game === "40k"
          ? { enable40kFactions: true }
          : null;
    const skip = (page - 1) * limit;

    const queryConditions = [];
    if (!isGuest) {
      queryConditions.push({ createdBy: userId });
      if (isValidObjectId(userId)) {
        queryConditions.push({
          "participants.userId": new mongoose.Types.ObjectId(userId),
        });
      }
      // Fallback for legacy participant records that pre-date the userId field
      if (userName) {
        queryConditions.push({ "participants.name": userName });
      }
    } else {
      queryConditions.push({ "participants.guestId": userId });
      // Fallback for guest rows written before guestId existed
      const possibleNames = [userId];
      if (userName && userName !== userId) possibleNames.push(userName);
      queryConditions.push({ "participants.name": { $in: possibleNames } });
    }

    const baseQuery = { $or: queryConditions };
    const gameScopedBaseQuery = enable40kCondition
      ? { ...baseQuery, ...enable40kCondition }
      : baseQuery;
    const filter =
      status && status !== "all"
        ? { ...gameScopedBaseQuery, status }
        : gameScopedBaseQuery;

    const [tournaments, statusAgg] = await Promise.all([
      Tournament.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Tournament.aggregate([
        { $match: gameScopedBaseQuery },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    const statusCounts = { all: 0, pending: 0, active: 0, completed: 0 };
    for (const { _id, count } of statusAgg) {
      if (_id in statusCounts) statusCounts[_id] = count;
      statusCounts.all += count;
    }

    // status is constrained to allowedStatuses, whose members are exactly the
    // pre-initialized statusCounts keys, so statusCounts[status] is never
    // undefined and the `?? 0` fallback below is unreachable.
    const total =
      status && status !== "all"
        ? /* node:coverage ignore next */
          (statusCounts[status] ?? 0)
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
export const updateDescription = async (req, res) => {
  try {
    const { id } = req.params;
    const { description } = req.body;

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
    emitTournamentUpdated(tournament._id.toString(), tournament);

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
