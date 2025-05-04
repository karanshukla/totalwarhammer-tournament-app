import crypto from "crypto";

import AuthStateService from "../../../infrastructure/services/auth-state-service.js";
import logger from "../../../infrastructure/utils/logger.js";

const authStateService = new AuthStateService();

export const createGuestUser = async (req, res) => {
  try {
    const guestId = crypto.randomBytes(16).toString("hex");
    const guestUsername = `Guest_${crypto.randomBytes(4).toString("hex")}`;

    // Create guest authentication state
    authStateService.createGuestAuthState(req, guestId);

    req.session.user = {
      ...req.session.user,
      username: guestUsername,
      email: "", // Guests don't have email
    };

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
    logger.error(`Error creating guest user: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: "Failed to create guest user",
      error: error.message,
    });
  }
};

export const updateGuestUsername = async (req, res) => {
  try {
    const { username } = req.body;

    // Validate username
    if (!username || typeof username !== "string" || username.length < 3) {
      return res.status(400).json({
        success: false,
        message: "Username must be at least 3 characters long",
      });
    }

    if (!req.user || !req.user.id) {
      logger.warn("Guest username update: req.user missing", {
        sessionExists: !!req.session,
        sessionUser: !!req.session?.user,
      });

      if (req.session) {
        if (!req.session.user && req.session.id) {
          logger.info("Creating minimal guest user from session ID");
          req.session.user = {
            id: req.session.id,
            isGuest: true,
            role: "guest",
            username: username, // Use the incoming username
          };
          req.session.isGuest = true;
          req.session.isAuthenticated = true;

          req.user = req.session.user;
        } else if (req.session.user) {
          req.user = req.session.user;
        } else {
          return res.status(401).json({
            success: false,
            message: "Authentication required: No valid user data found",
            debug: {
              sessionExists: !!req.session,
              sessionID: req.session?.id,
            },
          });
        }
      } else {
        return res.status(401).json({
          success: false,
          message: "Authentication required: No session found",
        });
      }
    }

    req.user.isGuest = true;
    if (req.session && req.session.user) {
      req.session.user.isGuest = true;
      req.session.isGuest = true;
      req.session.isAuthenticated = true;
    }

    req.user.username = username;
    if (req.session && req.session.user) {
      req.session.user.username = username;
    }

    const expiresAt =
      Date.now() + (req.session?.cookie?.maxAge || 48 * 60 * 60 * 1000);

    if (req.session && req.session.save) {
      try {
        await new Promise((resolve, reject) => {
          req.session.save((err) => {
            if (err) {
              logger.error(`Error saving session: ${err.message}`, { err });
              reject(err);
            } else {
              logger.debug("Session saved successfully", {
                sessionID: req.session.id,
                username,
              });
              resolve();
            }
          });
        });
      } catch (saveError) {
        logger.error("Failed to save session", { error: saveError });
      }
    }

    if (req.session.touch) {
      try {
        req.session.touch();
        logger.debug("Session touched to extend expiration");
      } catch (touchError) {
        logger.warn("Error touching session", { error: touchError });
      }
    }

    logger.debug("Guest username updated successfully", {
      username,
      sessionId: req.session?.id,
      userId: req.user.id,
    });

    res.status(200).json({
      success: true,
      message: "Guest username updated successfully",
      data: {
        id: req.user.id,
        username: username,
        email: "",
        isGuest: true,
        expiresAt,
      },
    });
  } catch (error) {
    logger.error(`Error updating guest username: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: "Failed to update guest username",
      error: error.message,
    });
  }
};
