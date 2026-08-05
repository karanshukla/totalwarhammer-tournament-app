import { body, query } from "express-validator";

// bcrypt only hashes the first 72 bytes; rejecting longer input beats
// silently ignoring the tail of someone's passphrase.
const MAX_PASSWORD_LENGTH = 72;

/** @type {import('express-validator').ValidationChain[]} */
export const validateUserExists = [
  query("identifier")
    .trim()
    .notEmpty()
    .withMessage("Identifier is required")
    .isLength({ min: 3, max: 100 })
    .withMessage("Identifier must be between 3 and 100 characters")
    .escape(),
];

/** @type {import('express-validator').ValidationChain[]} */
export const validateUserRegistration = [
  body("username")
    .trim()
    .notEmpty()
    .withMessage("Username is required")
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be between 3 and 30 characters")
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(
      "Username can only contain letters, numbers, underscores, and hyphens",
    )
    .escape(),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Email is not valid")
    .normalizeEmail(),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8, max: MAX_PASSWORD_LENGTH })
    .withMessage(
      `Password must be between 8 and ${MAX_PASSWORD_LENGTH} characters long`,
    ),
];

/** @type {import('express-validator').ValidationChain[]} */
export const validateGuestUsername = [
  body("username")
    .trim()
    .notEmpty()
    .withMessage("Username is required")
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be between 3 and 30 characters")
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(
      "Username can only contain letters, numbers, underscores, and hyphens",
    )
    .escape(),
];

/** @type {import('express-validator').ValidationChain[]} */
export const validateUpdateUsername = [
  body("username")
    .trim()
    .notEmpty()
    .withMessage("Username is required")
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be between 3 and 30 characters")
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(
      "Username can only contain letters, numbers, underscores, and hyphens",
    )
    .escape(),
];

/** @type {import('express-validator').ValidationChain[]} */
export const validateUpdatePassword = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),

  body("newPassword")
    .notEmpty()
    .withMessage("New password is required")
    .isLength({ min: 8, max: MAX_PASSWORD_LENGTH })
    .withMessage(
      `New password must be between 8 and ${MAX_PASSWORD_LENGTH} characters long`,
    ),

  body("confirmPassword")
    .notEmpty()
    .withMessage("Password confirmation is required")
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error("Passwords don't match");
      }
      return true;
    }),
];
