import { body, param } from "express-validator";

import { allFactions } from "../../../../constants/factions.js";

export const MAX_PARTICIPANT_NAME_LENGTH = 100;
export const MAX_REASON_LENGTH = 500;

/** @param {string} name @param {string} label */
export const objectIdParam = (name, label) =>
  param(name).isMongoId().withMessage(`Invalid ${label} ID`);

/**
 * Faction is optional everywhere and an empty string means "no faction".
 * Anything else must be a name the faction registry knows about.
 * @param {string} field
 */
export const optionalFaction = (field) =>
  body(field)
    .optional({ nullable: true })
    .isString()
    .withMessage("Faction must be a string")
    .bail()
    .custom((value) => {
      if (value === "" || allFactions.includes(value)) return true;
      throw new Error("Unknown faction");
    });

/** @param {string} field */
export const participantName = (field) =>
  body(field)
    .exists({ values: "falsy" })
    .withMessage("Name is required")
    .bail()
    .isString()
    .withMessage("Name must be a string")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ max: MAX_PARTICIPANT_NAME_LENGTH })
    .withMessage(
      `Name cannot exceed ${MAX_PARTICIPANT_NAME_LENGTH} characters`,
    );

/** @param {string} field */
export const optionalReason = (field) =>
  body(field)
    .optional({ nullable: true })
    .isString()
    .withMessage("Reason must be a string")
    .bail()
    .trim()
    .isLength({ max: MAX_REASON_LENGTH })
    .withMessage(`Reason cannot exceed ${MAX_REASON_LENGTH} characters`);
