import SessionService from "../../../infrastructure/services/session-service.js";

const sessionService = new SessionService();

/**
 * Middleware to verify user authentication from session
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const authenticateSession = (req, res, next) => {
  try {
    // Check if session exists and user is authenticated
    if (!sessionService.isAuthenticated(req)) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized: Not authenticated" });
    }

    // Add user information from session to request object
    req.user = sessionService.getCurrentUser(req);

    if (!req.user) {
      return res
        .status(401)
        .json({
          success: false,
          message: "Unauthorized: Invalid session user",
        });
    }

    next();
  } catch (error) {
    console.error("Session authentication failed:", error.message);
    return res
      .status(500)
      .json({
        success: false,
        message: "Internal server error during authentication",
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
      return res
        .status(401)
        .json({
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

export { authenticateSession, checkRole };
export default authenticateSession;
