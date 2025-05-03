import { body, query } from "express-validator";

export const validateUserExists = [
  query("identifier")
    .trim()
    .notEmpty()
    .withMessage("Identifier is required")
    .isLength({ min: 3, max: 100 })
    .withMessage("Identifier must be between 3 and 100 characters")
    .escape(),
];

export const validateUserRegistration = [
  body("username")
    .trim()
    .notEmpty()
    .withMessage("Username is required")
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be between 3 and 30 characters")
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(
      "Username can only contain letters, numbers, underscores, and hyphens"
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
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]+$/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
];

export const validateGuestUsername = [
  body("username")
    .trim()
    .notEmpty()
    .withMessage("Username is required")
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be between 3 and 30 characters")
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(
      "Username can only contain letters, numbers, underscores, and hyphens"
    )
    .escape(),
];
