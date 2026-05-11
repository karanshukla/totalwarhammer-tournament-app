import { body } from "express-validator";

const VALID_FACTIONS = [
  "Empire",
  "Dwarfs",
  "Greenskins",
  "Vampire Counts",
  "Warriors of Chaos",
  "Beastmen",
  "Wood Elves",
  "Bretonnia",
  "Norsca",
  "High Elves",
  "Dark Elves",
  "Lizardmen",
  "Skaven",
  "Tomb Kings",
  "Vampire Coast",
  "Kislev",
  "Cathay",
  "Ogre Kingdoms",
  "Daemons of Chaos",
  "Khorne",
  "Nurgle",
  "Slaanesh",
  "Tzeentch",
  "Chaos Dwarfs",
];

const VALID_TYPES = [
  "Single Elimination",
  "Double Elimination",
  "Round Robin",
  "Swiss System",
];

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

  body("bannedFactions")
    .optional()
    .isArray()
    .withMessage("Banned factions must be an array")
    .custom((factions) => {
      if (!Array.isArray(factions)) return true;
      const invalid = factions.filter((f) => !VALID_FACTIONS.includes(f));
      if (invalid.length > 0) {
        throw new Error(`Invalid factions: ${invalid.join(", ")}`);
      }
      return true;
    }),
];
