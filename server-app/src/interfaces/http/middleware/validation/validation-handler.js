/** @import { Request, Response, NextFunction } from 'express' */

import { validationResult } from "express-validator";

/**
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 */
export const validationHandler = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const fieldErrors = errors.array().map((error) => ({
      field: error.path,
      message: error.msg,
    }));

    // Clients read `message` to surface failures, so lead with the first
    // field's reason rather than a generic "Validation error".
    return res.status(400).json({
      success: false,
      message: fieldErrors[0]?.message ?? "Validation error",
      errors: fieldErrors,
    });
  }

  next();
};
