import bcrypt from "bcrypt";

import User from "../../../domain/models/user.js";

export const userExists = async (req, res) => {
  try {
    const { identifier } = req.query;

    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: "Missing identifier parameter",
      });
    }

    // Check if user exists by username or email
    if (typeof identifier !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid identifier format",
      });
    }

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

    if (typeof username !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid username format",
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

export const updateGuestUsername = async (req, res) => {
  try {
    const { username } = req.body;
    const userId = req.user.id;

    if (!req.user.isGuest) {
      return res.status(403).json({
        success: false,
        message:
          "Only guest users can update their username using this endpoint",
      });
    }

    const existingUsername = await User.findOne({
      username,
      _id: { $ne: userId },
    });

    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: "Username already taken",
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { username },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Username updated successfully",
      data: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        isGuest: true,
      },
    });
  } catch (error) {
    console.error("Error updating guest username:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update username",
      error: error.message,
    });
  }
};

export const updateUsername = async (req, res) => {
  try {
    const { username } = req.body;
    const userId = req.user.id;

    const existingUsername = await User.findOne({
      username,
      _id: { $ne: userId },
    });

    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: "Username already taken",
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { username },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (req.session && req.session.user) {
      req.session.user.username = username;
      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    res.status(200).json({
      success: true,
      message: "Username updated successfully",
      data: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
      },
    });
  } catch (error) {
    console.error("Error updating username:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update username",
      error: error.message,
    });
  }
};

export const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId).select("+password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isPasswordValid = await user.validatePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Error updating password:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update password",
      error: error.message,
    });
  }
};
