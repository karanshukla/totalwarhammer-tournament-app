import AuthStateService from "../../../infrastructure/services/auth-state-service.js";
import logger from "../../../infrastructure/utils/logger.js";

const authStateService = new AuthStateService();

/**
 * Requires an authenticated (non-guest) session. Returns 401 when the session
 * is missing, the isAuthenticated flag is not set, or the UA fingerprint
 * doesn't match the one recorded at login.
 *
 * @type {import('express').RequestHandler}
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
    logger.error(`Session authentication failed: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Internal server error during authentication",
    });
  }
};

/**
 * Requires a guest session. Attempts to recover a partial session when the
 * user object is missing but a session ID is present.
 *
 * @type {import('express').RequestHandler}
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

    if (!req.session) {
      logger.warn("Guest auth failed: No session object");
      return res.status(401).json({
        success: false,
        message: "Unauthorized: No session found",
      });
    }

    if (req.session.user) {
      req.user = req.session.user;

      if (!req.user.isGuest && req.session.isGuest) {
        req.user.isGuest = true;
        logger.debug("Fixed missing isGuest flag on user object");
      }
    } else if (req.session.id) {
      logger.warn(
        "Attempting session recovery: Session exists but user data is missing",
      );

      req.user = {
        id: req.session.id,
        isGuest: true,
        role: "guest",
        username: `Guest_${req.session.id.substring(0, 6)}`,
      };

      req.session.user = req.user;
      req.session.isGuest = true;
      req.session.isAuthenticated = true;

      logger.info("Guest session recovered with minimal user data", {
        sessionId: req.session.id,
        recoveredUser: req.user,
      });

      if (req.session.save) {
        req.session.save((err) => {
          if (err) {
            logger.error("Failed to save recovered session:", err);
          }
        });
      }
    } else {
      logger.warn("Guest auth failed: No user in session");
      return res.status(401).json({
        success: false,
        message: "Unauthorized: No user data in session",
      });
    }

    next();
  } catch (error) {
    logger.error("Guest session authentication error:", error);
    return res.status(500).json({
      success: false,
      message: "Error during guest authentication",
    });
  }
};

/**
 * Factory that returns middleware requiring the authenticated user to have one
 * of the specified roles.
 *
 * @param {string | string[]} roles
 * @returns {import('express').RequestHandler}
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
