/**
 * Service for managing user authentication state
 */
import logger from "../utils/logger.js";

class AuthStateService {
  constructor() {
    this.DEFAULT_SESSION_TIMEOUT = 2 * 60 * 60 * 1000; // 2 hours
    this.REMEMBER_ME_TIMEOUT = 7 * 24 * 60 * 60 * 1000; // 7 days
    this.GUEST_SESSION_TIMEOUT = 2 * 24 * 60 * 60 * 1000; // 48 hours
  }

  /**
   * Creates a new user session
   * @param {Object} req - Express request object
   * @param {Object} userData - User data to store in session
   */
  createSession(req, userData) {
    if (!userData || !req) {
      throw new Error("Invalid request or user data");
    }

    // Store user data in session (excluding sensitive information)
    const sessionUser = {
      id: userData._id || userData.id,
      email: userData.email,
      username: userData.username,
      role: userData.role || "user",
      isGuest: userData.isGuest || false,
    };

    req.session.user = sessionUser;
    req.session.isAuthenticated = true;
    req.session.createdAt = new Date();

    // Store fingerprint data for additional security
    req.session.fingerprint = {
      ip: req.ip,
      userAgent: req.get("user-agent"),
    };

    // Set default session timeout
    req.session.cookie.maxAge = this.DEFAULT_SESSION_TIMEOUT;

    // For remember me functionality
    if (userData.rememberMe) {
      // Extend session expiration for remember me
      req.session.cookie.maxAge = this.REMEMBER_ME_TIMEOUT;
    }
  }

  /**
   * Get current user from session
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
      return false;
    }

    // Additional security check for session hijacking prevention
    if (req.session.fingerprint) {
      const currentIp = req.ip;
      const currentUserAgent = req.get("user-agent");

      // Special handling for guest users - less strict validation
      if (req.session.isGuest) {
        //loosen validation for guest users
        return true;
      } else {
        // For regular users, keep the full validation
        if (
          req.session.fingerprint.ip !== currentIp ||
          req.session.fingerprint.userAgent !== currentUserAgent
        ) {
          logger.warn("Session rejected: IP or user agent mismatch");
          logger.warn(
            `Original IP: ${req.session.fingerprint.ip}, Current IP: ${currentIp}`
          );
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Destroy user session
   * @param {Object} req - Express request object
   * @param {Function} callback - Callback function
   */
  destroySession(req, callback) {
    if (req.session) {
      req.session.destroy(callback);
    } else if (callback) {
      callback();
    }
  }

  /**
   * Create guest session
   * @param {Object} req - Express request object
   * @param {string} guestId - ID for the guest user
   */
  createGuestSession(req, guestId) {
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

    // Store fingerprint data for additional security
    req.session.fingerprint = {
      ip: req.ip,
      userAgent: req.get("user-agent"),
    };

    // Guest sessions expire after 2 days
    req.session.cookie.maxAge = this.GUEST_SESSION_TIMEOUT;
  }
}

export default AuthStateService;
