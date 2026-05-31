import crypto from "crypto";
import { promisify } from "util";

import User from "../../../domain/models/user.js";
import AuthStateService from "../../../infrastructure/services/auth-state-service.js";
import logger from "../../../infrastructure/utils/logger.js";

const authStateService = new AuthStateService();

const authorizationCodes = new Map();

// Cleanup interval for expired authorization codes (runs every 15 minutes)
const CODE_EXPIRATION_TIME = 5 * 60 * 1000; // 5 minutes
setInterval(
  () => {
    const now = Date.now();
    for (const [code, data] of authorizationCodes.entries()) {
      if (now - data.createdAt > CODE_EXPIRATION_TIME) {
        authorizationCodes.delete(code);
        logger.debug(
          `Removed expired authorization code: ${code.substring(0, 8)}...`,
        );
      }
    }
  },
  15 * 60 * 1000,
).unref();

/** @type {import('express').RequestHandler} */
export const login = async (req, res) => {
  try {
    const {
      identifier,
      password,
      rememberMe = false,
      codeChallenge,
      codeChallengeMethod,
      state,
    } = req.body;

    if (
      typeof identifier !== "string" ||
      typeof password !== "string" ||
      !identifier.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Username/email and password are required",
      });
    }

    const normalizedIdentifier = identifier.trim();

    let user;
    if (normalizedIdentifier.includes("@")) {
      // Email-based login: try lowercase first (handles normalizeEmail stored values),
      // then fall back to exact match (for accounts registered before normalization)
      user = await User.findOne({
        email: { $eq: normalizedIdentifier.toLowerCase() },
      }).select("+password");
      if (!user) {
        user = await User.findOne({
          email: { $eq: normalizedIdentifier },
        }).select("+password");
      }
    } else {
      user = await User.findOne({
        username: { $eq: normalizedIdentifier },
      }).select("+password");
    }

    if (!user) {
      logger.warn(`Failed login attempt for identifier: ${normalizedIdentifier}`);
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const isPasswordValid = await user.validatePassword(password);
    if (!isPasswordValid) {
      logger.warn(`Failed login attempt (wrong password) for user: ${user.id}`);
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    if (codeChallenge) {
      if (codeChallengeMethod !== "S256") {
        return res.status(400).json({
          success: false,
          message: "Only S256 code challenge method is supported",
        });
      }

      const authorizationCode = generateAuthCode();

      authorizationCodes.set(authorizationCode, {
        userId: user.id,
        codeChallenge,
        codeChallengeMethod,
        createdAt: Date.now(),
        used: false,
        rememberMe,
      });

      logger.debug(`PKCE authorization code generated for user: ${user.id}`);
      return res.status(200).json({
        success: true,
        message: "Authorization code generated",
        data: {
          id: user.id,
          email: user.email,
          username: user.username,
          authorizationCode,
          state,
        },
      });
    }

    try {
      // Create user session
      await authStateService.createUserAuthState(req, {
        ...user.toObject(),
        rememberMe,
      });

      logger.info(`User logged in: ${user.id} (${user.username}), rememberMe=${rememberMe}`);
      res.status(200).json({
        success: true,
        message: "Login successful",
        data: {
          id: user.id,
          email: user.email,
          username: user.username,
          expiresAt:
            req.session.cookie.expires?.getTime() ||
            Date.now() + req.session.cookie.maxAge,
        },
      });
    } catch (sessionError) {
      logger.error(`Session creation error: ${sessionError.message}`, {
        error: sessionError,
      });
      return res.status(500).json({
        success: false,
        message: "Failed to create user session",
      });
    }
  } catch (error) {
    logger.error(`Login error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: "Failed to login",
    });
  }
};

/** @type {import('express').RequestHandler} */
export const token = async (req, res) => {
  try {
    const { grant_type, code, code_verifier } = req.body;

    if (grant_type !== "authorization_code") {
      return res.status(400).json({
        success: false,
        message: "Invalid grant type",
      });
    }

    if (!code || !code_verifier) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters",
      });
    }

    // Check if the authorization code exists and is valid
    const codeData = authorizationCodes.get(code);
    if (!codeData) {
      return res.status(400).json({
        success: false,
        message: "Invalid authorization code",
      });
    }

    // Check if the code has been used before
    if (codeData.used) {
      // Delete the code and reject the request (potential replay attack)
      authorizationCodes.delete(code);
      logger.warn(`Authorization code replay attempt for user: ${codeData.userId}`);
      return res.status(400).json({
        success: false,
        message: "Authorization code has already been used",
      });
    }

    // Check if the code has expired
    const now = Date.now();
    if (now - codeData.createdAt > CODE_EXPIRATION_TIME) {
      authorizationCodes.delete(code);
      logger.warn(`Expired authorization code used for user: ${codeData.userId}`);
      return res.status(400).json({
        success: false,
        message: "Authorization code has expired",
      });
    }

    // Verify the code_verifier by generating a code challenge from it
    const codeChallenge = generateCodeChallenge(code_verifier);

    // Use a constant-time comparison to prevent timing attacks
    if (!timingSafeEqual(codeChallenge, codeData.codeChallenge)) {
      return res.status(400).json({
        success: false,
        message: "Code verifier does not match code challenge",
      });
    }

    // Mark the code as used
    codeData.used = true;

    // Retrieve the user
    const user = await User.findById(codeData.userId);
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found",
      });
    }

    try {
      // Create user session with the rememberMe preference from the code data
      await authStateService.createUserAuthState(req, {
        ...user.toObject(),
        rememberMe: codeData.rememberMe || false,
      });

      // Remove the code after successful use
      setTimeout(() => authorizationCodes.delete(code), 1000);

      logger.info(`PKCE token exchange successful for user: ${user.id} (${user.username})`);
      return res.status(200).json({
        success: true,
        message: "Authentication successful",
        data: {
          id: user.id,
          email: user.email,
          username: user.username,
          expiresAt:
            req.session.cookie.expires?.getTime() ||
            Date.now() + req.session.cookie.maxAge,
        },
      });
    } catch (sessionError) {
      logger.error(`Session creation error: ${sessionError.message}`, {
        error: sessionError,
      });
      return res.status(500).json({
        success: false,
        message: "Failed to create user session",
      });
    }
  } catch (error) {
    logger.error(`Token exchange error: ${error.message}`, { error });
    return res.status(500).json({
      success: false,
      message: "Failed to authenticate",
    });
  }
};

/** @type {import('express').RequestHandler} */
export const logout = async (req, res) => {
  // If no session exists, simply return success
  if (!req.session) {
    return res.status(200).json({
      success: true,
      message: "No active session to logout",
    });
  }

  try {
    // Promisify the session destroy method
    const clearAuth = promisify(
      authStateService.clearAuthState.bind(authStateService),
    );

    // Clear the authentication state
    const loggedOutUser = req.user?.id;
    await clearAuth(req);

    res.clearCookie("sid"); // Clear the session cookie

    logger.info(`User logged out: ${loggedOutUser}`);
    res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    logger.error(`Logout error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: "Failed to logout",
    });
  }
};

// Helper function to generate random authorization code
function generateAuthCode() {
  return crypto.randomBytes(24).toString("hex");
}

// Helper function to generate code challenge from code verifier (S256 method)
/**
 * @param {crypto.BinaryLike} codeVerifier
 */
function generateCodeChallenge(codeVerifier) {
  const hash = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return hash;
}

/**
 * Performs a constant-time comparison of two strings to prevent timing attacks
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {boolean} - True if strings are equal
 */
function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") {
    return false;
  }

  if (a.length !== b.length) {
    return false;
  }

  // For node.js environment, we can use the built-in crypto.timingSafeEqual
  // but for browsers or if that's not available, implement a more basic version
  try {
    const bufA = Buffer.from(a, "utf8");
    const bufB = Buffer.from(b, "utf8");
    return crypto.timingSafeEqual(bufA, bufB);
    // eslint-disable-next-line no-unused-vars
  } catch (err) {
    // Fallback implementation
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }
}
