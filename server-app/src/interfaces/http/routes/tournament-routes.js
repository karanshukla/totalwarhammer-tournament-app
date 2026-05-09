import express from "express";

import * as tournamentController from "../controllers/tournament-controller.js";
import authenticateSession from "../middleware/auth-middleware.js";
import { validateCreateTournament } from "../middleware/validation/tournament-validation.js";
import { validationHandler } from "../middleware/validation/validation-handler.js";

const router = express.Router();

router.get("/", tournamentController.getTournaments);

router.post(
  "/",
  authenticateSession,
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
  tournamentController.addParticipant,
);

router.patch(
  "/:id/participants/:participantId",
  authenticateSession,
  tournamentController.updateParticipant,
);

router.delete(
  "/:id/participants/:participantId",
  authenticateSession,
  tournamentController.removeParticipant,
);

router.post(
  "/:id/join",
  authenticateSession,
  tournamentController.joinTournament,
);

router.post(
  "/:id/start",
  authenticateSession,
  tournamentController.startTournament,
);

router.post(
  "/:id/advance",
  authenticateSession,
  tournamentController.advanceRound,
);

router.patch(
  "/:id/description",
  authenticateSession,
  tournamentController.updateDescription,
);

router.delete(
  "/:id",
  authenticateSession,
  tournamentController.deleteTournament,
);

export default router;
