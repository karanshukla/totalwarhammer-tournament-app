import { body } from "express-validator";

import { allFactions } from "../../../../constants/factions.js";

const VALID_TYPES = [
  "Single Elimination",
  "Double Elimination",
  "Round Robin",
  "Swiss System",
];

/** @type {import('express-validator').ValidationChain[]} */
export const validateCreateTournament = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Tournament name is required")
    .isLength({ min: 3, max: 100 })
    .withMessage("Tournament name must be between 3 and 100 characters")
    .escape(),

  body("description")
    .optional()
    .isLength({ max: 2000 })
    .withMessage("Description cannot exceed 2000 characters"),

  body("playerCount")
    .isInt({ min: 2, max: 128 })
    .withMessage("Player count must be between 2 and 128"),

  body("tournamentType")
    .notEmpty()
    .withMessage("Tournament type is required")
    .isIn(VALID_TYPES)
    .withMessage(`Tournament type must be one of: ${VALID_TYPES.join(", ")}`),

  body("enable40kFactions")
    .optional()
    .isBoolean()
    .withMessage("enable40kFactions must be a boolean"),

  body("bannedFactions")
    .optional()
    .isArray()
    .withMessage("Banned factions must be an array")
    .custom((factions) => {
      if (!Array.isArray(factions)) return true;
      const invalid = factions.filter((f) => !allFactions.includes(f));
      if (invalid.length > 0) {
        throw new Error(`Invalid factions: ${invalid.join(", ")}`);
      }
      return true;
    }),
];
