import { body } from "express-validator";

/** @type {import('express-validator').ValidationChain[]} */
export const validateLogin = [
  body("identifier")
    .trim()
    .notEmpty()
    .withMessage("Username or email is required")
    .isLength({ min: 3, max: 100 })
    .withMessage("Username or email must be between 3 and 100 characters"),

  body("password").notEmpty().withMessage("Password is required"),

  body("codeChallenge")
    .optional()
    .isString()
    .withMessage("Code challenge must be a string")
    .isLength({ min: 43, max: 128 })
    .withMessage("Code challenge must be between 43 and 128 characters"),

  body("codeChallengeMethod")
    .if(body("codeChallenge").exists())
    .equals("S256")
    .withMessage("Only S256 code challenge method is supported"),

  body("state").optional().isString().withMessage("State must be a string"),

  body("rememberMe")
    .optional()
    .isBoolean()
    .withMessage("RememberMe must be a boolean"),
];

/** @type {import('express-validator').ValidationChain[]} */
export const validateToken = [
  body("grant_type")
    .notEmpty()
    .withMessage("Grant type is required")
    .equals("authorization_code")
    .withMessage("Grant type must be authorization_code"),

  body("code")
    .notEmpty()
    .withMessage("Authorization code is required")
    .isString()
    .withMessage("Authorization code must be a string")
    .isLength({ min: 10 })
    .withMessage("Invalid authorization code format"),

  body("code_verifier")
    .notEmpty()
    .withMessage("Code verifier is required")
    .isString()
    .withMessage("Code verifier must be a string")
    .isLength({ min: 43, max: 128 })
    .withMessage("Code verifier must be between 43 and 128 characters"),
];
