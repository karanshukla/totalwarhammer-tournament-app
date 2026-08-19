/* eslint-disable no-unused-vars */
import crypto from "crypto";

import Tournament from "../../../domain/models/tournament.js";
import User from "../../../domain/models/user.js";
import AuthStateService from "../../../infrastructure/services/auth-state-service.js";
import logger from "../../../infrastructure/utils/logger.js";

const authStateService = new AuthStateService();

/** @type {import('express').RequestHandler} */
export const createGuestUser = async (req, res) => {
  try {
    const guestId = crypto.randomUUID();
    const guestUsername = `Guest_${crypto.randomBytes(4).toString("hex")}`;

    authStateService.createGuestAuthState(req, guestId, guestUsername);

    await new Promise((resolve, reject) => {
      req.session.save((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const expiresAt =
      Date.now() + (req.session.cookie.maxAge || 48 * 60 * 60 * 1000); // Default 48 hours

    res.status(200).json({
      success: true,
      message: "Guest user created successfully",
      data: {
        id: guestId,
        username: guestUsername,
        email: "",
        isGuest: true,
        expiresAt,
      },
    });
  } catch (error) {
    logger.error(`Error creating guest user: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to create guest user",
    });
  }
};

/** @type {import('express').RequestHandler} */
export const updateGuestUsername = async (req, res) => {
  try {
    const { username } = req.body;

    if (
      !username ||
      typeof username !== "string" ||
      username.length < 3 ||
      username.length > 30
    ) {
      return res.status(400).json({
        success: false,
        message: "Username must be between 3 and 30 characters long",
      });
    }

    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({
        success: false,
        message:
          "Username can only contain letters, numbers, underscores, and hyphens",
      });
    }

    if (!req.user || !req.user.id) {
      logger.warn("Guest username update: req.user missing");
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!req.user.isGuest) {
      return res.status(403).json({
        success: false,
        message:
          "Only guest users can update their username through this endpoint",
      });
    }

    const registeredHolder = await User.findOne({ username: { $eq: username } })
      .select("_id")
      .lean();
    if (registeredHolder) {
      return res.status(400).json({
        success: false,
        message: "Username already taken",
      });
    }

    const guestId = req.user.id;
    const oldUsername = req.user.username;
    req.user.username = username;
    if (req.session && req.session.user) {
      req.session.user.username = username;
    }

    // Rename only the rows this guest owns. Filtering on the old display name
    // alone would rename every identically-named participant in every
    // tournament, since a guest chooses their own name and names are not
    // unique.
    try {
      await Tournament.updateMany(
        { "participants.guestId": guestId },
        { $set: { "participants.$[elem].name": username } },
        { arrayFilters: [{ "elem.guestId": guestId }] },
      );
      logger.info(
        `Guest ${guestId} renamed from "${oldUsername}" to "${username}"`,
      );
    } catch (err) {
      logger.warn(
        `Failed to update participant names in tournaments: ${err.message}`,
      );
    }

    const expiresAt =
      Date.now() + (req.session?.cookie?.maxAge || 48 * 60 * 60 * 1000);

    if (req.session && req.session.save) {
      try {
        await new Promise((resolve, reject) => {
          req.session.save((err) => {
            if (err) {
              logger.error(`Error saving session: ${err.message}`);
              reject(err);
            } else {
              logger.debug("Session saved successfully");
              resolve();
            }
          });
        });
      } catch (_) {
        logger.error("Failed to save session");
      }
    }

    if (req.session && req.session.touch) {
      try {
        req.session.touch();
        logger.debug("Session touched to extend expiration");
      } catch (_) {
        logger.warn("Error touching session");
      }
    }

    logger.debug("Guest username updated successfully");

    res.status(200).json({
      success: true,
      message: "Guest username updated successfully",
      data: {
        username: username,
        isGuest: true,
        expiresAt,
      },
    });
  } catch (error) {
    logger.error(`Error updating guest username: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to update guest username",
    });
  }
};
