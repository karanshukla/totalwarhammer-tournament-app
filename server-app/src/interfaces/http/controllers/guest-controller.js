import crypto from "crypto";

import AuthStateService from "../../../infrastructure/services/auth-state-service.js";
import logger from "../../../infrastructure/utils/logger.js";

const authStateService = new AuthStateService();

export const createGuestUser = async (req, res) => {
  try {
    // Generate a unique guest ID
    const guestId = crypto.randomBytes(16).toString("hex");

    // Generate a unique username for the guest
    const guestUsername = `Guest_${crypto.randomBytes(4).toString("hex")}`;

    // Create guest session
    authStateService.createGuestSession(req, guestId);

    // Store additional guest data in the session
    req.session.user = {
      ...req.session.user,
      username: guestUsername,
      email: "", // Guests don't have email
    };

    // Ensure session is saved
    await new Promise((resolve, reject) => {
      req.session.save((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Calculate expiration time
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

    // Log the received data for debugging
    logger.debug("Updating guest username, received data:", {
      body: req.body,
      sessionData: {
        hasSession: !!req.session,
        hasUser: !!req.session?.user,
        isAuthenticated: !!req.session?.isAuthenticated,
        isGuest: !!req.session?.isGuest,
        username: req.session?.user?.username,
      },
    });

    // Validate username
    if (!username || typeof username !== "string" || username.length < 3) {
      return res.status(400).json({
        success: false,
        message: "Username must be at least 3 characters long",
      });
    }

    // At this point, we should have req.user populated from middleware
    if (!req.user || !req.user.id) {
      logger.warn(
        "Guest username update: req.user missing but proceeding with session data"
      );

      // Try to use session data if available
      if (req.session && req.session.user && req.session.user.id) {
        req.user = req.session.user;
      } else {
        return res.status(401).json({
          success: false,
          message: "Authentication required: No valid user data found",
        });
      }
    }

    // Ensure the guest flags are set
    req.user.isGuest = true;
    if (req.session && req.session.user) {
      req.session.user.isGuest = true;
      req.session.isGuest = true;
      req.session.isAuthenticated = true;
    }

    // Update username in session
    if (req.session && req.session.user) {
      req.session.user.username = username;
    }

    // Calculate expiration time
    const expiresAt =
      Date.now() + (req.session?.cookie?.maxAge || 48 * 60 * 60 * 1000);

    // Save the session explicitly to ensure changes persist
    if (req.session && req.session.save) {
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
