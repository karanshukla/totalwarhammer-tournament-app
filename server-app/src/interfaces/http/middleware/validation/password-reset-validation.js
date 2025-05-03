import { body } from "express-validator";

export const validatePasswordResetEmail = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Email is not valid")
    .normalizeEmail(),
];

export const validateResetToken = [
  body("token")
    .notEmpty()
    .withMessage("Reset token is required")
    .isString()
    .withMessage("Token must be a string")
    .isLength({ min: 20 })
    .withMessage("Invalid token format"),
];

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
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long"),
];
