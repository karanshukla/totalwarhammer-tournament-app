import { promisify } from "util";

import User from "../../../domain/models/user.js";
import AuthStateService from "../../../infrastructure/services/auth-state-service.js";
import logger from "../../../infrastructure/utils/logger.js";
import { issueAuthorizationCode } from "./authentication-pkce-controller.js";

const authStateService = new AuthStateService();

export { token } from "./authentication-pkce-controller.js";

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
      // The identifier is usually an email address, and this line ships to the
      // log files and to Axiom on every failed attempt.
      logger.warn("Failed login attempt for an unrecognised identifier");
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

      const authorizationCode = issueAuthorizationCode(
        user.id,
        codeChallenge,
        codeChallengeMethod,
        rememberMe,
      );

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
      await authStateService.createUserAuthState(req, {
        ...user.toObject(),
        rememberMe,
      });

      logger.info(
        `User logged in: ${user.id} (${user.username}), rememberMe=${rememberMe}`,
      );
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
export const logout = async (req, res) => {
  if (!req.session) {
    return res.status(200).json({
      success: true,
      message: "No active session to logout",
    });
  }

  try {
    const clearAuth = promisify(
      authStateService.clearAuthState.bind(authStateService),
    );

    const loggedOutUser = req.user?.id;
    await clearAuth(req);

    res.clearCookie("sid");

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
