import express from "express";

import * as matchController from "../controllers/match-controller.js";
import authenticateSession from "../middleware/auth-middleware.js";

const router = express.Router();

router.get("/tournament/:tournamentId", matchController.getMatchesByTournament);

router.get("/:id", matchController.getMatchById);

router.post("/", authenticateSession, matchController.createMatch);

router.patch("/:id/result", authenticateSession, matchController.recordResult);

router.patch(
  "/:id/override",
  authenticateSession,
  matchController.overrideResult,
);

router.patch(
  "/:id/status",
  authenticateSession,
  matchController.updateMatchStatus,
);

export default router;
