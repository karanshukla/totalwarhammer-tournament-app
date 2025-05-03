import bcrypt from "bcrypt";

import User from "../../../domain/models/user.js";
import JwtService from "../../../infrastructure/services/jwt-service.js";

const jwtService = new JwtService();

export const userExists = async (req, res) => {
  try {
    const { identifier } = req.query; // Use query parameter instead of body

    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: "Missing identifier parameter",
      });
    }

    // Check if user exists by username or email
    let user = await User.findOne({ username: identifier });
    if (!user) {
      user = await User.findOne({ email: identifier });
    }

    return res.status(200).json({
      success: true,
      message: user ? "User exists" : "User does not exist",
      data: {
        exists: !!user,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to check user existence",
      error: error.message,
    });
  }
};

export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: "Email already in use",
      });
    }

    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: "Username already taken",
      });
    }
    const newUser = await User.create({
      username,
      email,
      password: await bcrypt.hash(password, 10),
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to register user",
      error: error.message,
    });
  }
};

export const createGuestUser = async (req, res) => {
  try {
    // Generate a unique username for the guest user
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const guestUsername = `guest_${timestamp}_${randomString}`;

    // Create a guest user without a password
    const guestUser = await User.create({
      username: guestUsername,
      email: `${guestUsername}@guest.local`, // Dummy email
      // No password needed for guest users
    });

    // Generate a guest JWT token with 48-hour expiration
    const token = jwtService.generateToken(
      {
        id: guestUser.id,
        email: guestUser.email,
        isGuest: true,
      },
      "guest"
    );

    // Get token expiration for client reference
    const decoded = jwtService.decodeToken(token);
    const expiresAt = decoded.exp * 1000; // Convert to milliseconds

    // Set HttpOnly cookie with the token
    const maxAge = expiresAt - Date.now();
    res.cookie("jwt", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge,
      path: "/",
    });

    res.status(201).json({
      success: true,
      message: "Guest user created successfully",
      data: {
        id: guestUser.id,
        username: guestUser.username,
        email: guestUser.email,
        isGuest: true,
        expiresAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create guest user",
      error: error.message,
    });
  }
};
