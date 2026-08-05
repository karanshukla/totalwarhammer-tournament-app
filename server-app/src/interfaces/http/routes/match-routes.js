import express from "express";

import * as matchController from "../controllers/match-controller.js";
import authenticateSession from "../middleware/auth-middleware.js";
import { doubleCsrfProtection } from "../middleware/csrf-middleware.js";
import {
  validateMatchIdParam,
  validateTournamentIdParam,
  validateCreateMatch,
  validateReportResult,
  validateResolveDispute,
  validateRecordResult,
  validateOverrideResult,
  validateUpdateMatchStatus,
} from "../middleware/validation/match-validation.js";
import { validationHandler } from "../middleware/validation/validation-handler.js";

const router = express.Router();

router.get(
  "/tournament/:tournamentId",
  validateTournamentIdParam,
  validationHandler,
  matchController.getMatchesByTournament,
);

router.get(
  "/:id",
  validateMatchIdParam,
  validationHandler,
  matchController.getMatchById,
);

router.post(
  "/",
  authenticateSession,
  doubleCsrfProtection,
  validateCreateMatch,
  validationHandler,
  matchController.createMatch,
);

router.patch(
  "/:id/report",
  authenticateSession,
  doubleCsrfProtection,
  validateReportResult,
  validationHandler,
  matchController.reportResult,
);
router.patch(
  "/:id/resolve",
  authenticateSession,
  doubleCsrfProtection,
  validateResolveDispute,
  validationHandler,
  matchController.resolveDispute,
);
router.patch(
  "/:id/result",
  authenticateSession,
  doubleCsrfProtection,
  validateRecordResult,
  validationHandler,
  matchController.recordResult,
);

router.patch(
  "/:id/override",
  authenticateSession,
  doubleCsrfProtection,
  validateOverrideResult,
  validationHandler,
  matchController.overrideResult,
);

router.patch(
  "/:id/status",
  authenticateSession,
  doubleCsrfProtection,
  validateUpdateMatchStatus,
  validationHandler,
  matchController.updateMatchStatus,
);

export default router;
