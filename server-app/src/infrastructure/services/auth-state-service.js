/**
 * Service for managing user authentication state
 */
import logger from "../utils/logger.js";

class AuthStateService {
  constructor() {
    this.DEFAULT_AUTH_STATE_TIMEOUT = 2 * 60 * 60 * 1000; // 2 hours
    this.REMEMBER_ME_TIMEOUT = 7 * 24 * 60 * 60 * 1000; // 7 days
    this.GUEST_AUTH_STATE_TIMEOUT = 2 * 24 * 60 * 60 * 1000; // 48 hours
  }

  /**
   * Creates a new user authentication state in the server
   * Maybe worth moving to redis
   * @param {Object} req - Express request object
   * @param {Object} userData - User data to store in session
   */
  createUserAuthState(req, userData) {
    if (!userData || !req) {
      throw new Error("Invalid request or user data");
    }

    const authStateUser = {
      id: userData._id || userData.id,
      email: userData.email,
      username: userData.username,
      role: userData.role || "user",
      isGuest: userData.isGuest || false,
    };

    req.session.user = authStateUser;
    req.session.isAuthenticated = true;
    req.session.createdAt = new Date();

    req.session.fingerprint = {
      ip: req.ip,
      userAgent: req.get("user-agent"),
    };

    // Initialize session.cookie if it doesn't exist
    if (!req.session.cookie) {
      req.session.cookie = {};
    }

    req.session.cookie.maxAge = this.DEFAULT_AUTH_STATE_TIMEOUT;

    if (userData.rememberMe) {
      req.session.cookie.maxAge = this.REMEMBER_ME_TIMEOUT;
    }
  }

  /**
   * Get current user from authentication state
   * @param {Object} req - Express request object
   * @returns {Object|null} - User data or null if not authenticated
   */
  getCurrentUser(req) {
    return req.session && req.session.user ? req.session.user : null;
  }

  /**
   * Check if user is authenticated
   * @param {Object} req - Express request object
   * @returns {boolean} - True if authenticated
   */
  isAuthenticated(req) {
    if (!req.session || !req.session.isAuthenticated) {
      logger.debug(
        "Authentication state invalid: missing session or isAuthenticated flag"
      );
      return false;
    }

    const isGuest =
      req.session.isGuest === true || req.session.user?.isGuest === true;

    if (isGuest) {
      logger.debug(
        "Guest authentication detected, using relaxed authentication rules"
      );
      if (!req.session.user || !req.session.user.id) {
        logger.warn(
          "Guest authentication rejected: missing or invalid user data"
        );
        return false;
      }

      if (req.session.fingerprint && req.session.fingerprint.userAgent) {
        const currentUserAgent = req.get("user-agent");
        if (req.session.fingerprint.userAgent !== currentUserAgent) {
          logger.warn("Guest authentication rejected: user agent mismatch");
          return false;
        }
      }

      return true;
    }

    if (req.session.fingerprint) {
      const currentIp = req.ip;
      const currentUserAgent = req.get("user-agent");

      // For regular users, keep the full validation
      if (
        req.session.fingerprint.ip !== currentIp ||
        req.session.fingerprint.userAgent !== currentUserAgent
      ) {
        logger.warn("Authentication rejected: IP or user agent mismatch");
        logger.warn(
          `Original IP: ${req.session.fingerprint.ip}, Current IP: ${currentIp}`
        );
        return false;
      }
    }

    return true;
  }

  /**
   * Clear user authentication state
   * @param {Object} req - Express request object
   * @param {Function} callback - Callback function
   */
  clearAuthState(req, callback) {
    if (req.session) {
      // Only pass the callback if it exists
      if (callback) {
        req.session.destroy(callback);
      } else {
        req.session.destroy();
      }
    } else if (callback) {
      callback();
    }
  }

  /**
   * Create guest authentication state
   * @param {Object} req - Express request object
   * @param {string} guestId - ID for the guest user
   */
  createGuestAuthState(req, guestId) {
    if (!guestId || !req) {
      throw new Error("Invalid request or guest ID");
    }

    const guestUser = {
      id: guestId,
      isGuest: true,
      role: "guest",
    };

    req.session.user = guestUser;
    req.session.isAuthenticated = true;
    req.session.isGuest = true;
    req.session.createdAt = new Date();

    req.session.fingerprint = {
      ip: req.ip,
      userAgent: req.get("user-agent"),
    };

    // Initialize session.cookie if it doesn't exist
    if (!req.session.cookie) {
      req.session.cookie = {};
    }

    req.session.cookie.maxAge = this.GUEST_AUTH_STATE_TIMEOUT;

    if (req.session.save) {
      req.session.save((err) => {
        if (err) {
          console.error("Error saving guest authentication state:", err);
        }
      });
    }
  }
}

export default AuthStateService;
