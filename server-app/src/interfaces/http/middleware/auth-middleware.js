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
    // Just check if there's any session data for the user
    if (!req.session || !req.session.user) {
      logger.debug("Guest auth debug: No session or user data found");
      return res.status(401).json({
        success: false,
        message: "Unauthorized: No session data",
        debug: { hasSession: !!req.session },
      });
    }

    // Set the user object regardless of other checks
    req.user = req.session.user;

    // Add debugging data
    logger.debug("Guest session auth debug:", {
      sessionId: req.session.id,
      isAuthenticated: !!req.session.isAuthenticated,
      isGuest: !!req.session.isGuest,
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
