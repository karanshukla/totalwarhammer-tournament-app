import crypto from "crypto";

import User from "../../../domain/models/user.js";
import SessionService from "../../../infrastructure/services/session-service.js";

const sessionService = new SessionService();

// In-memory store for authorization codes (in production, use Redis or another solution)
const authorizationCodes = new Map();

export const login = async (req, res) => {
  try {
    const {
      email,
      password,
      rememberMe = false,
      codeChallenge,
      codeChallengeMethod,
      state,
    } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }
    const isPasswordValid = await user.validatePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
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
        rememberMe, // Store the rememberMe preference with the code
      });

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

    // Create user session
    sessionService.createSession(req, {
      ...user.toObject(),
      rememberMe,
    });

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
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to login",
      error: error.message,
    });
  }
};

// New token endpoint for PKCE code exchange
export const token = async (req, res) => {
  try {
    const { grant_type, code, code_verifier } = req.body;

    if (grant_type !== "authorization_code") {
      return res.status(400).json({
        success: false,
        message: "Invalid grant type",
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
      return res.status(400).json({
        success: false,
        message: "Authorization code has already been used",
      });
    }

    // Check if the code has expired (codes valid for 5 minutes)
    const now = Date.now();
    if (now - codeData.createdAt > 5 * 60 * 1000) {
      authorizationCodes.delete(code);
      return res.status(400).json({
        success: false,
        message: "Authorization code has expired",
      });
    }

    // Verify the code_verifier by generating a code challenge from it
    const codeChallenge = generateCodeChallenge(code_verifier);
    if (codeChallenge !== codeData.codeChallenge) {
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

    // Create user session with the rememberMe preference from the code data
    sessionService.createSession(req, {
      ...user.toObject(),
      rememberMe: codeData.rememberMe || false,
    });

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
  } catch (error) {
    console.error("Token exchange error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to authenticate",
      error: error.message,
    });
  }
};

export const logout = async (req, res) => {
  try {
    // Destroy the session
    sessionService.destroySession(req, (err) => {
      if (err) {
        throw new Error("Failed to destroy session");
      }

      res.status(200).json({
        success: true,
        message: "Logout successful",
      });
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to logout",
      error: error.message,
    });
  }
};

// Helper function to generate random authorization code
function generateAuthCode() {
  return crypto.randomBytes(24).toString("hex");
}

// Helper function to generate code challenge from code verifier (S256 method)
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
