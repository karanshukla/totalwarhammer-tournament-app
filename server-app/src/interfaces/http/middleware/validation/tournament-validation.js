import { body, param, query } from "express-validator";

import {
  gameSystemLabel,
  gameSystemOf,
} from "../../../../domain/services/faction-eligibility-service.js";
import { isFactionInGame } from "../../../../constants/factions.js";

import {
  objectIdParam,
  optionalFaction,
  participantName,
} from "./common-validation.js";

const VALID_TYPES = [
  "Single Elimination",
  "Double Elimination",
  "Round Robin",
  "Swiss System",
];

const VALID_STATUSES = ["pending", "active", "completed"];

const MAX_DESCRIPTION_LENGTH = 2000;

/** @type {import('express-validator').ValidationChain[]} */
export const validateCreateTournament = [
  body("name")
    .exists({ values: "falsy" })
    .withMessage("Tournament name is required")
    .bail()
    .isString()
    .withMessage("Tournament name must be a string")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("Tournament name is required")
    .isLength({ min: 3, max: 100 })
    .withMessage("Tournament name must be between 3 and 100 characters")
    .escape(),

  body("description")
    .optional({ nullable: true })
    .isString()
    .withMessage("Description must be a string")
    .bail()
    .isLength({ max: MAX_DESCRIPTION_LENGTH })
    .withMessage(
      `Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters`,
    ),

  body("playerCount")
    .isInt({ min: 2, max: 128 })
    .withMessage("Player count must be between 2 and 128")
    .toInt(),

  body("tournamentType")
    .notEmpty()
    .withMessage("Tournament type is required")
    .isIn(VALID_TYPES)
    .withMessage(`Tournament type must be one of: ${VALID_TYPES.join(", ")}`),

  body("enable40kFactions")
    .optional()
    .isBoolean()
    .withMessage("enable40kFactions must be a boolean"),

  // Banning a faction the tournament's game system doesn't have is always a
  // mistake — usually a stale selection left over from toggling WH3 / 40K.
  body("bannedFactions")
    .optional()
    .isArray()
    .withMessage("Banned factions must be an array")
    .custom((factions, { req }) => {
      if (!Array.isArray(factions)) return true;
      const game = gameSystemOf(req.body);
      const invalid = factions.filter((f) => !isFactionInGame(f, game));
      if (invalid.length > 0) {
        throw new Error(
          `Not ${gameSystemLabel(game)} factions: ${invalid.join(", ")}`,
        );
      }
      return true;
    }),
];

/** @type {import('express-validator').ValidationChain[]} */
export const validateTournamentIdParam = [objectIdParam("id", "tournament")];

/** @type {import('express-validator').ValidationChain[]} */
export const validateParticipantParams = [
  objectIdParam("id", "tournament"),
  objectIdParam("participantId", "participant"),
];

/** @type {import('express-validator').ValidationChain[]} */
export const validateTournamentCodeParam = [
  param("code")
    .trim()
    .isLength({ min: 1, max: 12 })
    .withMessage("Invalid tournament code")
    .isAlphanumeric()
    .withMessage("Invalid tournament code"),
];

/** @type {import('express-validator').ValidationChain[]} */
export const validateAddParticipant = [
  objectIdParam("id", "tournament"),
  participantName("name"),
  optionalFaction("faction"),
];

/** @type {import('express-validator').ValidationChain[]} */
export const validateUpdateParticipant = [
  objectIdParam("id", "tournament"),
  objectIdParam("participantId", "participant"),
  body("name")
    .optional()
    .isString()
    .withMessage("Name must be a string")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ max: 100 })
    .withMessage("Name cannot exceed 100 characters"),
  optionalFaction("faction"),
];

/** @type {import('express-validator').ValidationChain[]} */
export const validateJoinTournament = [
  objectIdParam("id", "tournament"),
  optionalFaction("faction"),
];

/** @type {import('express-validator').ValidationChain[]} */
export const validateUpdateDescription = [
  objectIdParam("id", "tournament"),
  body("description")
    .exists()
    .withMessage("Description is required")
    .bail()
    .isString()
    .withMessage("Description must be a string")
    .bail()
    .isLength({ max: MAX_DESCRIPTION_LENGTH })
    .withMessage(
      `Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters`,
    ),
];

/** @type {import('express-validator').ValidationChain[]} */
export const validateListTournamentsQuery = [
  query("status")
    .optional()
    .isString()
    .withMessage("Status filter must be a string")
    .bail()
    .custom((value) => {
      const invalid = value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .filter((s) => !VALID_STATUSES.includes(s));
      if (invalid.length > 0) {
        throw new Error(
          `Status filter must be one of: ${VALID_STATUSES.join(", ")}`,
        );
      }
      return true;
    }),
];
