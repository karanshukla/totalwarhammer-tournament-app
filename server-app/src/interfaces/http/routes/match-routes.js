import express from "express";

import * as matchController from "../controllers/match-controller.js";
import authenticateSession from "../middleware/auth-middleware.js";
import { doubleCsrfProtection } from "../middleware/csrf-middleware.js";

const router = express.Router();

router.get("/tournament/:tournamentId", matchController.getMatchesByTournament);

router.get("/:id", matchController.getMatchById);

router.post("/", authenticateSession, doubleCsrfProtection, matchController.createMatch);

router.patch("/:id/report", authenticateSession, doubleCsrfProtection, matchController.reportResult);
router.patch(
  "/:id/resolve",
  authenticateSession,
  doubleCsrfProtection,
  matchController.resolveDispute,
);
router.patch("/:id/result", authenticateSession, doubleCsrfProtection, matchController.recordResult);

router.patch(
  "/:id/override",
  authenticateSession,
  doubleCsrfProtection,
  matchController.overrideResult,
);

router.patch(
  "/:id/status",
  authenticateSession,
  doubleCsrfProtection,
  matchController.updateMatchStatus,
);

export default router;
