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
 * Lighter authentication middleware for guest operations
 * More lenient to help debug guest user issues
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

    // Set the user object from session if available
    if (req.session.user) {
      req.user = req.session.user;
    } else {
      logger.warn("Guest auth failed: No user in session");
      return res.status(401).json({
        success: false,
        message: "Unauthorized: No user data in session",
        debug: { sessionId: req.session.id },
      });
    }

    // Add debugging data
    logger.debug("Guest session auth debug data:", {
      sessionId: req.session.id,
      isAuthenticated: !!req.session.isAuthenticated,
      isGuest: !!req.session.isGuest || !!req.session.user.isGuest,
      user: req.user,
    });

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
