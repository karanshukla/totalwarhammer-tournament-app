import User from "../../../domain/models/user.js";
import bcrypt from "bcrypt";

export const userExists = async (req, res) => {
  try {
    const { username } = req.body
    let user = await User.findOne({ username });
    if (!user) {
      user = await User.findOne({ email: username });
    }
    return res.status(200).json({
      success: true,
      message: user ? "User exists" : "User does not exist",
      data: {
        exists: !!user
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to check user existence",
      error: error.message
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
