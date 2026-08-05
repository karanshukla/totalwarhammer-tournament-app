import { body } from "express-validator";

// bcrypt only hashes the first 72 bytes; rejecting longer input beats
// silently ignoring the tail of someone's passphrase.
const MAX_PASSWORD_LENGTH = 72;

/** @type {import('express-validator').ValidationChain[]} */
export const validatePasswordResetEmail = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Email is not valid")
    .normalizeEmail(),
];

/** @type {import('express-validator').ValidationChain[]} */
export const validateResetToken = [
  body("token")
    .notEmpty()
    .withMessage("Reset token is required")
    .isString()
    .withMessage("Token must be a string")
    .isLength({ min: 20 })
    .withMessage("Invalid token format"),
];

/** @type {import('express-validator').ValidationChain[]} */
export const validateResetPassword = [
  body("token")
    .notEmpty()
    .withMessage("Reset token is required")
    .isString()
    .withMessage("Token must be a string")
    .isLength({ min: 20 })
    .withMessage("Invalid token format"),

  body("newPassword")
    .notEmpty()
    .withMessage("New password is required")
    .isLength({ min: 8, max: MAX_PASSWORD_LENGTH })
    .withMessage(
      `Password must be between 8 and ${MAX_PASSWORD_LENGTH} characters long`,
    ),
];
