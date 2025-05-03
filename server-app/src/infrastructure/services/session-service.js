/**
 * Service for managing user sessions
 */
class SessionService {
  /**
   * Creates a new user session
   * @param {Object} req - Express request object
   * @param {Object} userData - User data to store in session
   */
  createSession(req, userData) {
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

    // For remember me functionality
    if (userData.rememberMe) {
      // Extend session expiration for remember me
      req.session.cookie.maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
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
    return req.session && req.session.isAuthenticated === true;
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
    const guestUser = {
      id: guestId,
      isGuest: true,
      role: "guest",
    };

    req.session.user = guestUser;
    req.session.isAuthenticated = true;
    req.session.isGuest = true;
    req.session.createdAt = new Date();

    // Guest sessions expire after 2 days
    req.session.cookie.maxAge = 2 * 24 * 60 * 60 * 1000; // 48 hours
  }
}

export default SessionService;
