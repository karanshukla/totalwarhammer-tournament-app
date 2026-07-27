import { promisify } from "util";

import { UAParser } from "ua-parser-js";

import logger from "../utils/logger.js";

/**
 * Parses a User-Agent string into a normalised fingerprint that only captures
 * browser family and OS family. Minor version bumps (e.g. Chrome 124 → 125)
 * are deliberately ignored so they don't invalidate a live session.
 *
 * @param {string | undefined} uaString
 * @returns {{ browser: string, os: string } | null}
 */
function parseUAFingerprint(uaString) {
  if (!uaString) return null;
  const { browser, os } = new UAParser(uaString).getResult();
  return {
    browser: browser.name ?? "Unknown",
    os: os.name ?? "Unknown",
  };
}

/**
 * @param {{ browser: string, os: string } | null | undefined} stored
 * @param {{ browser: string, os: string } | null | undefined} current
 * @returns {boolean}
 */
function fingerprintMatches(stored, current) {
  if (!stored || !current) return true;
  return stored.browser === current.browser && stored.os === current.os;
}

class AuthStateService {
  constructor() {
    this.DEFAULT_AUTH_STATE_TIMEOUT = 2 * 60 * 60 * 1000; // 2 hours
    this.REMEMBER_ME_TIMEOUT = 30 * 24 * 60 * 60 * 1000; // 30 days
    this.GUEST_AUTH_STATE_TIMEOUT = 2 * 24 * 60 * 60 * 1000; // 48 hours
  }

  /**
   * Creates a new authenticated session for a regular user.
   *
   * Writes all session metadata (user object, fingerprint, maxAge) and, when
   * passport is available on the request, also calls `req.login()` so that
   * `req.isAuthenticated()` works on all subsequent requests via
   * `passport.session()` + `deserializeUser`.
   *
   * @param {import('express').Request} req
   * @param {object} userData
   * @returns {Promise<void>}
   */
  async createUserAuthState(req, userData) {
    if (!userData || !req) {
      throw new Error("Invalid request or user data");
    }

    const sessionUser = {
      id: String(userData._id || userData.id),
      email: userData.email,
      username: userData.username,
      role: userData.role || "user",
      isGuest: userData.isGuest || false,
    };

    const maxAge = userData.rememberMe
      ? this.REMEMBER_ME_TIMEOUT
      : this.DEFAULT_AUTH_STATE_TIMEOUT;

    // Passport v0.6+ regenerates the session on req.login() to prevent session
    // fixation. All custom session properties must be set AFTER login() so they
    // land on the new session rather than the one that gets discarded.
    if (typeof req.login === "function") {
      const login = promisify(req.login.bind(req));
      await login(sessionUser);
    }

    req.session.user = sessionUser;
    req.session.isAuthenticated = true;
    req.session.createdAt = new Date();
    // authAt records when this session was authenticated, used to reject it
    // if the password is later changed elsewhere (issue #101).
    req.session.authAt = new Date();
    req.session.fingerprint = parseUAFingerprint(req.get("user-agent"));
    req.session.cookie.maxAge = maxAge;
  }

  /**
   * Returns true when the current session was authenticated at or after the
   * user's most recent password change. Returns true (fresh) when there is no
   * passwordChangedAt timestamp, no session authAt to compare against, or the
   * user record is unavailable — i.e. this only ever *rejects* a session when
   * it can prove the password changed after the session was established.
   *
   * @param {import('express').Request} req
   * @returns {boolean}
   */
  isSessionFresh(req) {
    const user = req.user || req.session?.user;
    const passwordChangedAt = user?.passwordChangedAt;
    if (!passwordChangedAt) return true;

    const authAt = req.session?.authAt;
    if (!authAt) return true;

    const changedMs = new Date(passwordChangedAt).getTime();
    const authMs = new Date(authAt).getTime();
    if (Number.isNaN(changedMs) || Number.isNaN(authMs)) return true;

    if (authMs < changedMs) {
      logger.warn(
        "Authentication rejected: session predates password change",
        { authAt, passwordChangedAt },
      );
      return false;
    }
    return true;
  }

  /**
   * Returns the authenticated user for this request.
   * Prefers passport's `req.user` (freshly loaded from DB on each request)
   * then falls back to the snapshot stored in the session at login time.
   *
   * @param {import('express').Request} req
   * @returns {object | null}
   */
  getCurrentUser(req) {
    return req.user || (req.session?.user ?? null);
  }

  /**
   * Returns true when the request belongs to a valid, un-tampered session.
   * Checks the session flag, the UA fingerprint (browser family + OS), and
   * that the session was authenticated after the user's most recent password
   * change (issue #101: changing a password must invalidate older sessions).
   *
   * @param {import('express').Request} req
   * @returns {boolean}
   */
  isAuthenticated(req) {
    if (!req.session || !req.session.isAuthenticated) {
      logger.debug(
        "Authentication state invalid: missing session or isAuthenticated flag",
      );
      return false;
    }

    const isGuest =
      req.session.isGuest === true || req.session.user?.isGuest === true;

    const stored = req.session.fingerprint;
    const current = parseUAFingerprint(req.get("user-agent"));

    // Reject sessions authenticated before the user changed their password.
    // req.user.passwordChangedAt is loaded fresh on every request by passport's
    // deserializeUser; req.session.authAt was stamped at login/update time.
    // Guests have no password and are exempt.
    if (!isGuest && !this.isSessionFresh(req)) {
      return false;
    }

    if (isGuest) {
      logger.debug(
        "Guest authentication detected, using relaxed authentication rules",
      );
      if (!req.session.user || !req.session.user.id) {
        logger.warn(
          "Guest authentication rejected: missing or invalid user data",
        );
        return false;
      }
      if (!fingerprintMatches(stored, current)) {
        logger.warn("Guest authentication rejected: UA fingerprint mismatch", {
          stored,
          current,
        });
        return false;
      }
      return true;
    }

    if (!fingerprintMatches(stored, current)) {
      logger.warn("Authentication rejected: UA fingerprint mismatch", {
        stored,
        current,
      });
      return false;
    }

    return true;
  }

  /**
   * Destroys the session. Uses passport's `req.logout()` when available;
   * falls back to `session.destroy()` for backward compatibility.
   *
   * @param {import('express').Request} req
   * @param {(err?: Error) => void} [callback]
   */
  clearAuthState(req, callback) {
    if (typeof req.logout === "function") {
      req.logout(callback || (() => {}));
    } else if (req.session) {
      req.session.destroy(callback || (() => {}));
    } else if (callback) {
      callback();
    }
  }

  /**
   * Creates a guest session. Guests are not managed by passport — they live
   * purely in the session and are identified by their UA fingerprint.
   *
   * @param {import('express').Request} req
   * @param {string} guestId
   * @param {string} [guestUsername]
   */
  createGuestAuthState(req, guestId, guestUsername) {
    if (!guestId || !req) {
      throw new Error("Invalid request or guest ID");
    }

    const guestUser = {
      id: guestId,
      username: guestUsername || `Guest_${guestId.substring(0, 6)}`,
      isGuest: true,
      role: "guest",
    };

    req.session.user = guestUser;
    req.session.isAuthenticated = true;
    req.session.isGuest = true;
    req.session.createdAt = new Date();
    req.session.authAt = new Date();
    req.session.fingerprint = parseUAFingerprint(req.get("user-agent"));

    req.session.cookie.maxAge = this.GUEST_AUTH_STATE_TIMEOUT;

    if (req.session.save) {
      req.session.save((err) => {
        if (err) {
          logger.error(
            `Error saving guest authentication state: ${err.message}`,
            { error: err },
          );
        }
      });
    }
  }
}

export { parseUAFingerprint };
export default AuthStateService;
