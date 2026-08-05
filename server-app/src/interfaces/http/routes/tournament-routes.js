import express from "express";

import * as tournamentController from "../controllers/tournament-controller.js";
import authenticateSession from "../middleware/auth-middleware.js";
import { doubleCsrfProtection } from "../middleware/csrf-middleware.js";
import {
  validateCreateTournament,
  validateTournamentIdParam,
  validateParticipantParams,
  validateTournamentCodeParam,
  validateAddParticipant,
  validateUpdateParticipant,
  validateJoinTournament,
  validateUpdateDescription,
  validateListTournamentsQuery,
} from "../middleware/validation/tournament-validation.js";
import { validationHandler } from "../middleware/validation/validation-handler.js";

const router = express.Router();

router.get(
  "/",
  validateListTournamentsQuery,
  validationHandler,
  tournamentController.getTournaments,
);

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

router.get(
  "/code/:code",
  validateTournamentCodeParam,
  validationHandler,
  tournamentController.getTournamentByCode,
);

router.get(
  "/:id",
  validateTournamentIdParam,
  validationHandler,
  tournamentController.getTournamentById,
);

router.post(
  "/:id/participants",
  authenticateSession,
  doubleCsrfProtection,
  validateAddParticipant,
  validationHandler,
  tournamentController.addParticipant,
);

router.patch(
  "/:id/participants/:participantId",
  authenticateSession,
  doubleCsrfProtection,
  validateUpdateParticipant,
  validationHandler,
  tournamentController.updateParticipant,
);

router.delete(
  "/:id/participants/:participantId",
  authenticateSession,
  doubleCsrfProtection,
  validateParticipantParams,
  validationHandler,
  tournamentController.removeParticipant,
);

router.post(
  "/:id/join",
  authenticateSession,
  doubleCsrfProtection,
  validateJoinTournament,
  validationHandler,
  tournamentController.joinTournament,
);

router.post(
  "/:id/start",
  authenticateSession,
  doubleCsrfProtection,
  validateTournamentIdParam,
  validationHandler,
  tournamentController.startTournament,
);

router.post(
  "/:id/advance",
  authenticateSession,
  doubleCsrfProtection,
  validateTournamentIdParam,
  validationHandler,
  tournamentController.advanceRound,
);

router.patch(
  "/:id/description",
  authenticateSession,
  doubleCsrfProtection,
  validateUpdateDescription,
  validationHandler,
  tournamentController.updateDescription,
);

router.delete(
  "/:id",
  authenticateSession,
  doubleCsrfProtection,
  validateTournamentIdParam,
  validationHandler,
  tournamentController.deleteTournament,
);

export default router;
