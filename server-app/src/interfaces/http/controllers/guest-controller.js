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
        sessionID: req.session?.id,
        cookies: req.headers.cookie ? "Present" : "None",
      },
    });

    // Validate username
    if (!username || typeof username !== "string" || username.length < 3) {
      return res.status(400).json({
        success: false,
        message: "Username must be at least 3 characters long",
      });
    }

    // First check for req.user (should be set by auth middleware)
    if (!req.user || !req.user.id) {
      logger.warn("Guest username update: req.user missing", {
        sessionExists: !!req.session,
        sessionUser: !!req.session?.user,
      });

      // If session exists, ensure it's properly initialized for guest user
      if (req.session) {
        if (!req.session.user && req.session.id) {
          // Create a minimal guest user with the session ID if missing
          logger.info("Creating minimal guest user from session ID");
          req.session.user = {
            id: req.session.id,
            isGuest: true,
            role: "guest",
            username: username, // Use the incoming username
          };
          req.session.isGuest = true;
          req.session.isAuthenticated = true;

          // Now we can use this user
          req.user = req.session.user;
        } else if (req.session.user) {
          // Use the existing session user
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

    // Ensure the guest flags are set
    req.user.isGuest = true;
    if (req.session && req.session.user) {
      req.session.user.isGuest = true;
      req.session.isGuest = true;
      req.session.isAuthenticated = true;
    }

    // Update username in session and user object
    req.user.username = username;
    if (req.session && req.session.user) {
      req.session.user.username = username;
    }

    // Calculate expiration time
    const expiresAt =
      Date.now() + (req.session?.cookie?.maxAge || 48 * 60 * 60 * 1000);

    // Save the session explicitly to ensure changes persist
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
        // Continue with the request even if session save fails
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
