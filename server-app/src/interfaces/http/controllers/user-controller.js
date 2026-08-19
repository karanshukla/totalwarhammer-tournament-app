import bcrypt from "bcrypt";

import Match from "../../../domain/models/match.js";
import Tournament from "../../../domain/models/tournament.js";
import User from "../../../domain/models/user.js";
import logger from "../../../infrastructure/utils/logger.js";

/** @type {import('express').RequestHandler} */
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
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to check user existence",
    });
  }
};

/** @type {import('express').RequestHandler} */
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

    logger.info(`New user registered: ${newUser.id} (${newUser.username})`);
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
    logger.error(`Register error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: "Failed to register user",
    });
  }
};

/** @type {import('express').RequestHandler} */
export const updateUsername = async (req, res) => {
  try {
    const { username } = req.body;
    const userId = req.user.id;
    if (req.user.isGuest) {
      return res.status(403).json({
        success: false,
        message: "This action requires a registered account.",
      });
    }

    // Validate username is a string to prevent NoSQL injection
    if (typeof username !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid username format",
      });
    }

    const existingUsername = await User.findOne({
      username: { $eq: username },
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
      { $set: { username } },
      { new: true },
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

    logger.info(`Username updated: user=${userId}, new username="${username}"`);
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
    logger.error(`Error updating username: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to update username",
    });
  }
};

/** @type {import('express').RequestHandler} */
export const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;

    if (req.user.isGuest) {
      return res.status(403).json({
        success: false,
        message: "Guest accounts cannot be deleted. Sign out instead.",
      });
    }

    const suffix = userId.toString().slice(-8);
    const anonymised = await User.findByIdAndUpdate(
      userId,
      {
        username: `deleted_${suffix}`,
        email: `deleted_${suffix}@deleted.invalid`,
        password: null,
        // Evicts this account's sessions on other devices via the freshness
        // check in AuthStateService.isAuthenticated — destroying the current
        // session alone would leave the rest of them usable.
        passwordChangedAt: new Date(),
      },
      { new: true },
    );

    if (!anonymised) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    await new Promise((resolve, reject) => {
      req.session.destroy((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.clearCookie("sid");
    logger.info(`Account anonymized: user=${userId}`);
    return res
      .status(200)
      .json({ success: true, message: "Account deleted successfully" });
  } catch (error) {
    logger.error(`Error deleting account: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Failed to delete account",
    });
  }
};

/**
 * Compute one game's per-user stats. `enable40kOperator` is the MongoDB
 * comparison applied to the tournament's enable40kFactions flag:
 *   wh3 → { $ne: true } (historical, unchanged numbers)
 *   40k → { $eq: true }
 * For wh3 we keep the historical per-slot beta-faction exclusion; for 40k the
 * slots ARE beta-tagged, so we count them.
 */
async function computeUserGameStats(
  userId,
  username,
  enable40kOperator,
  excludeBetaFactions,
) {
  const tournamentIds = await Tournament.find({
    enable40kFactions: enable40kOperator,
  })
    .select("_id")
    .lean()
    .then((docs) => docs.map((d) => d._id));

  const [tournamentsCreatedCount, matchesAsP1, matchesAsP2] = await Promise.all(
    [
      Tournament.countDocuments({
        createdBy: userId,
        enable40kFactions: enable40kOperator,
      }),

      Match.find({
        "player1.name": username,
        status: "completed",
        tournament: { $in: tournamentIds },
      })
        .select("player1 player2 winnerId tournament")
        .lean(),

      Match.find({
        "player2.name": username,
        status: "completed",
        tournament: { $in: tournamentIds },
      })
        .select("player1 player2 winnerId tournament")
        .lean(),
    ],
  );

  const allMatches = [...matchesAsP1, ...matchesAsP2];
  const wins = allMatches.filter((m) => {
    const slot = m.player1.name === username ? m.player1 : m.player2;
    return (
      !!m.winnerId &&
      !!slot.participantId &&
      m.winnerId.toString() === slot.participantId.toString()
    );
  }).length;
  const losses = allMatches.length - wins;

  const factionCounts = {};
  for (const m of allMatches) {
    const slot = m.player1.name === username ? m.player1 : m.player2;
    if (slot.faction && (!excludeBetaFactions || !slot.isBetaFaction))
      factionCounts[slot.faction] = (factionCounts[slot.faction] || 0) + 1;
  }
  const factions = Object.entries(factionCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  return {
    tournamentsCreated: tournamentsCreatedCount,
    matchesPlayed: allMatches.length,
    wins,
    losses,
    factions,
  };
}

/** @type {import('express').RequestHandler} */
export const getUserStats = async (req, res) => {
  try {
    const userId = req.user.id;
    if (req.user.isGuest) {
      return res.status(403).json({
        success: false,
        message: "This action requires a registered account.",
      });
    }

    const user = await User.findById(userId).select("username").lean();
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const username = user.username;

    const [wh3, k40] = await Promise.all([
      computeUserGameStats(userId, username, { $ne: true }, true),
      computeUserGameStats(userId, username, { $eq: true }, false),
    ]);

    return res.status(200).json({
      success: true,
      data: { wh3, "40k": k40 },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user stats",
    });
  }
};

/** @type {import('express').RequestHandler} */
export const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    if (req.user.isGuest) {
      return res.status(403).json({
        success: false,
        message: "This action requires a registered account.",
      });
    }

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
    // Stamp passwordChangedAt so sessions authenticated before this moment
    // (i.e. on other devices) are rejected on their next request. The current
    // session is refreshed below so the device making the change stays in.
    user.passwordChangedAt = new Date();
    await user.save();

    // Keep the current session alive: its authAt must be >= passwordChangedAt.
    // Other sessions for this user are left untouched and will fail the
    // freshness check in AuthStateService.isAuthenticated on their next hit.
    if (req.session) {
      req.session.authAt = new Date(user.passwordChangedAt);
      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    logger.info(`Password updated for user: ${userId}`);
    res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    logger.error(`Error updating password: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to update password",
    });
  }
};
