import AuthStateService from "../../../infrastructure/services/auth-state-service.js";
import logger from "../../../infrastructure/utils/logger.js";

const authStateService = new AuthStateService();

/**
 * Middleware to verify user authentication from session
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const authenticateSession = (req, res, next) => {
  try {
    if (!authStateService.isAuthenticated(req)) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized: Not authenticated" });
    }

    req.user = authStateService.getCurrentUser(req);

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Invalid session user",
      });
    }

    next();
  } catch (error) {
    console.error("Session authentication failed:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error during authentication",
    });
  }
};

/**
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const authenticateGuestSession = (req, res, next) => {
  try {
    logger.debug("Guest auth middleware called", {
      sessionExists: !!req.session,
      sessionId: req.session?.id,
      sessionUser: !!req.session?.user,
      isGuest: req.session?.isGuest,
      userIsGuest: req.session?.user?.isGuest,
      cookies: req.headers.cookie ? "Present" : "None",
      headers: req.headers ? Object.keys(req.headers) : [],
    });

    // Check if session exists
    if (!req.session) {
      logger.warn("Guest auth failed: No session object");
      return res.status(401).json({
        success: false,
        message: "Unauthorized: No session found",
        debug: { cookies: req.headers.cookie ? "Present" : "None" },
      });
    }

    // Primary approach: Set the user object from session if available
    if (req.session.user) {
      req.user = req.session.user;

      // Ensure isGuest flag is set
      if (!req.user.isGuest && req.session.isGuest) {
        req.user.isGuest = true;
        logger.debug("Fixed missing isGuest flag on user object");
      }
    }
    // Fallback: Attempt to recover session if it might exist but user data is missing
    else if (req.session.id) {
      logger.warn(
        "Attempting session recovery: Session exists but user data is missing"
      );

      // Create minimal user object based on session data
      req.user = {
        id: req.session.id, // Use session ID as fallback user ID
        isGuest: true,
        role: "guest",
        username: `Guest_${req.session.id.substring(0, 6)}`, // Generate a basic username
      };

      // Store the recovered user back in the session
      req.session.user = req.user;
      req.session.isGuest = true;
      req.session.isAuthenticated = true;

      logger.info("Guest session recovered with minimal user data", {
        sessionId: req.session.id,
        recoveredUser: req.user,
      });

      // Save the session explicitly
      if (req.session.save) {
        req.session.save((err) => {
          if (err) {
            logger.error("Failed to save recovered session:", err);
          } else {
            logger.debug("Recovered session saved successfully");
          }
        });
      }
    } else {
      logger.warn("Guest auth failed: No user in session");
      return res.status(401).json({
        success: false,
        message: "Unauthorized: No user data in session",
        debug: { sessionId: req.session.id },
      });
    }

    next();
  } catch (error) {
    logger.error("Guest session authentication error:", error);
    return res.status(500).json({
      success: false,
      message: "Error during guest authentication",
      error: error.message,
    });
  }
};

/**
 * Middleware to check if user has required role
 * @param {Array|String} roles - Required roles for access
 */
const checkRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User not authenticated",
      });
    }

    const userRole = req.user.role || "user";

    const requiredRoles = Array.isArray(roles) ? roles : [roles];

    if (requiredRoles.includes(userRole)) {
      return next();
    }

    return res
      .status(403)
      .json({ success: false, message: "Forbidden: Insufficient permissions" });
  };
};

export { authenticateSession, authenticateGuestSession, checkRole };
export default authenticateSession;
