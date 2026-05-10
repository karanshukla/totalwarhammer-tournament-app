import cors from "cors";
import express from "express";

import { clientUrl } from "../../../infrastructure/config/env.js";

import authRoutes from "./authentication-routes.js";
import guestRoutes from "./guest-routes.js";
import matchRoutes from "./match-routes.js";
import passwordResetRoutes from "./password-reset-routes.js"; // Import password reset routes
import statsRoutes from "./stats-routes.js";
import tournamentRoutes from "./tournament-routes.js";
import userRoutes from "./user-routes.js";

const router = express.Router();

const corsOptions = {
  origin: clientUrl,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  preflightContinue: false,
  optionsSuccessStatus: 204,
  credentials: true, // Add this line to support credentials (cookies)
};

router.use(cors(corsOptions));

router.get("/", (req, res) => {
  res.redirect(clientUrl);
});

// Mount all routes with their specific prefixes
router.use("/user", userRoutes);
router.use("/auth", authRoutes);
router.use("/guest", guestRoutes);
router.use("/password-reset", passwordResetRoutes);
router.use("/tournament", tournamentRoutes);
router.use("/match", matchRoutes);
router.use("/stats", statsRoutes);

export default router;
