import express from "express";

import * as tournamentController from "../controllers/tournament-controller.js";
import authenticateSession from "../middleware/auth-middleware.js";
import { doubleCsrfProtection } from "../middleware/csrf-middleware.js";
import { validateCreateTournament } from "../middleware/validation/tournament-validation.js";
import { validationHandler } from "../middleware/validation/validation-handler.js";

const router = express.Router();

router.get("/", tournamentController.getTournaments);

router.post(
  "/",
  authenticateSession,
  doubleCsrfProtection,
  validateCreateTournament,
  validationHandler,
  tournamentController.createTournament,
);

router.get(
  "/mine",
  authenticateSession,
  tournamentController.getUserTournaments,
);

router.get("/code/:code", tournamentController.getTournamentByCode);

router.get("/:id", tournamentController.getTournamentById);

router.post(
  "/:id/participants",
  authenticateSession,
  doubleCsrfProtection,
  tournamentController.addParticipant,
);

router.patch(
  "/:id/participants/:participantId",
  authenticateSession,
  doubleCsrfProtection,
  tournamentController.updateParticipant,
);

router.delete(
  "/:id/participants/:participantId",
  authenticateSession,
  doubleCsrfProtection,
  tournamentController.removeParticipant,
);

router.post(
  "/:id/join",
  authenticateSession,
  doubleCsrfProtection,
  tournamentController.joinTournament,
);

router.post(
  "/:id/start",
  authenticateSession,
  doubleCsrfProtection,
  tournamentController.startTournament,
);

router.post(
  "/:id/advance",
  authenticateSession,
  doubleCsrfProtection,
  tournamentController.advanceRound,
);

router.patch(
  "/:id/description",
  authenticateSession,
  doubleCsrfProtection,
  tournamentController.updateDescription,
);

router.delete(
  "/:id",
  authenticateSession,
  doubleCsrfProtection,
  tournamentController.deleteTournament,
);

export default router;
