import { body } from "express-validator";

import {
  objectIdParam,
  optionalFaction,
  optionalReason,
  participantName,
} from "./common-validation.js";

const MAX_ROUND = 64;
const MAX_MATCH_NUMBER = 512;

const playerSlot = (slot) => [
  body(slot)
    .isObject()
    .withMessage(`${slot} must be an object`)
    .bail()
    .custom((value) => value !== null),
  participantName(`${slot}.name`),
  optionalFaction(`${slot}.faction`),
  body(`${slot}.participantId`)
    .optional({ nullable: true })
    .isMongoId()
    .withMessage("Invalid participant ID"),
];

/** @type {import('express-validator').ValidationChain[]} */
export const validateMatchIdParam = [objectIdParam("id", "match")];

/** @type {import('express-validator').ValidationChain[]} */
export const validateTournamentIdParam = [
  objectIdParam("tournamentId", "tournament"),
];

/** @type {import('express-validator').ValidationChain[]} */
export const validateCreateMatch = [
  body("tournamentId").isMongoId().withMessage("Invalid tournament ID"),

  body("round")
    .isInt({ min: 1, max: MAX_ROUND })
    .withMessage(`Round must be between 1 and ${MAX_ROUND}`)
    .toInt(),

  body("matchNumber")
    .isInt({ min: 1, max: MAX_MATCH_NUMBER })
    .withMessage(`Match number must be between 1 and ${MAX_MATCH_NUMBER}`)
    .toInt(),

  ...playerSlot("player1"),
  ...playerSlot("player2"),
];

const winnerId = body("winnerId")
  .isMongoId()
  .withMessage("A valid winner ID is required");

/** @type {import('express-validator').ValidationChain[]} */
export const validateReportResult = [objectIdParam("id", "match"), winnerId];

/** @type {import('express-validator').ValidationChain[]} */
export const validateRecordResult = [objectIdParam("id", "match"), winnerId];

/** @type {import('express-validator').ValidationChain[]} */
export const validateResolveDispute = [
  objectIdParam("id", "match"),
  winnerId,
  optionalReason("reason"),
];

/** @type {import('express-validator').ValidationChain[]} */
export const validateOverrideResult = [
  objectIdParam("id", "match"),
  winnerId,
  optionalReason("reason"),
];

/** @type {import('express-validator').ValidationChain[]} */
export const validateUpdateMatchStatus = [
  objectIdParam("id", "match"),
  body("status")
    .isIn(["pending", "in_progress"])
    .withMessage("Status must be pending or in_progress"),
];
