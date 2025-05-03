import crypto from "crypto";
import SessionService from "../../../infrastructure/services/session-service.js";

const sessionService = new SessionService();

export const createGuestUser = async (req, res) => {
  try {
    // Generate a unique guest ID
    const guestId = crypto.randomBytes(16).toString("hex");

    // Generate a unique username for the guest
    const guestUsername = `Guest_${crypto.randomBytes(4).toString("hex")}`;

    // Create guest session
    sessionService.createGuestSession(req, guestId);

    // Store additional guest data in the session
    req.session.user = {
      ...req.session.user,
      username: guestUsername,
      email: "", // Guests don't have email
    };

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
    console.error("Error creating guest user:", error);
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

    // Check if user is a guest
    if (!req.session.user || !req.session.isGuest) {
      return res.status(403).json({
        success: false,
        message:
          "Only guest users can update their username using this endpoint",
      });
    }

    // Update username in session
    req.session.user.username = username;

    // Calculate expiration time
    const expiresAt = Date.now() + (req.session.cookie.maxAge || 0);

    res.status(200).json({
      success: true,
      message: "Guest username updated successfully",
      data: {
        id: req.session.user.id,
        username: username,
        email: "",
        isGuest: true,
        expiresAt,
      },
    });
  } catch (error) {
    console.error("Error updating guest username:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update guest username",
      error: error.message,
    });
  }
};
