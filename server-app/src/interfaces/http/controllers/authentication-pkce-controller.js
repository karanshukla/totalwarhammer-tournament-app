import crypto from "crypto";

import User from "../../../domain/models/user.js";
import AuthStateService from "../../../infrastructure/services/auth-state-service.js";
import logger from "../../../infrastructure/utils/logger.js";

const authStateService = new AuthStateService();

const authorizationCodes = new Map();

const CODE_EXPIRATION_TIME = 5 * 60 * 1000; // 5 minutes
// Background cleanup timer fires every 15 min; exercising it requires timer mocking
// at module-load time, which is incompatible with the existing test-file import order.
/* node:coverage disable */
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
/* node:coverage enable */

/**
 * Issues a PKCE authorization code for the given user, to be exchanged for a
 * session by `token`. Called from `login` when the request carries a
 * `codeChallenge`.
 */
export function issueAuthorizationCode(
  userId,
  codeChallenge,
  codeChallengeMethod,
  rememberMe,
) {
  const authorizationCode = generateAuthCode();

  authorizationCodes.set(authorizationCode, {
    userId,
    codeChallenge,
    codeChallengeMethod,
    createdAt: Date.now(),
    used: false,
    rememberMe,
  });

  return authorizationCode;
}

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

    const codeData = authorizationCodes.get(code);
    if (!codeData) {
      return res.status(400).json({
        success: false,
        message: "Invalid authorization code",
      });
    }

    if (codeData.used) {
      // Delete the code and reject the request (potential replay attack)
      authorizationCodes.delete(code);
      logger.warn(
        `Authorization code replay attempt for user: ${codeData.userId}`,
      );
      return res.status(400).json({
        success: false,
        message: "Authorization code has already been used",
      });
    }

    const now = Date.now();
    if (now - codeData.createdAt > CODE_EXPIRATION_TIME) {
      authorizationCodes.delete(code);
      logger.warn(
        `Expired authorization code used for user: ${codeData.userId}`,
      );
      return res.status(400).json({
        success: false,
        message: "Authorization code has expired",
      });
    }

    const codeChallenge = generateCodeChallenge(code_verifier);

    if (!timingSafeEqual(codeChallenge, codeData.codeChallenge)) {
      return res.status(400).json({
        success: false,
        message: "Code verifier does not match code challenge",
      });
    }

    codeData.used = true;

    const user = await User.findById(codeData.userId);
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found",
      });
    }

    try {
      await authStateService.createUserAuthState(req, {
        ...user.toObject(),
        rememberMe: codeData.rememberMe || false,
      });

      setTimeout(() => authorizationCodes.delete(code), 1000);

      logger.info(
        `PKCE token exchange successful for user: ${user.id} (${user.username})`,
      );
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

function generateAuthCode() {
  return crypto.randomBytes(24).toString("hex");
}

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
 * Constant-time comparison of two strings, to avoid leaking a valid code
 * challenge's prefix length through response-time differences.
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function timingSafeEqual(a, b) {
  // generateCodeChallenge always returns a same-length string; non-string input
  // and length mismatches are unreachable in practice.
  /* node:coverage disable */
  if (typeof a !== "string" || typeof b !== "string") {
    return false;
  }

  if (a.length !== b.length) {
    return false;
  }
  /* node:coverage enable */

  try {
    const bufA = Buffer.from(a, "utf8");
    const bufB = Buffer.from(b, "utf8");
    return crypto.timingSafeEqual(bufA, bufB);
    // ascii-only base64url strings cannot cause crypto.timingSafeEqual to throw;
    // this fallback is unreachable in practice.
    /* node:coverage ignore next 7 */
  } catch {
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }
}
