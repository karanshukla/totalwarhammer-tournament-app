import passport from "passport";

import User from "../../domain/models/user.js";
import logger from "../utils/logger.js";

passport.serializeUser((user, done) => {
  done(null, String(user._id || user.id));
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).select("-password");
    if (!user) {
      logger.debug(`Passport deserializeUser: user ${id} not found`);
      return done(null, false);
    }
    // Return a plain object with the shape controllers expect
    done(null, {
      id: user.id,
      email: user.email,
      username: user.username,
      role: "user",
      isGuest: false,
    });
  } catch (err) {
    done(err);
  }
});

export { passport };
