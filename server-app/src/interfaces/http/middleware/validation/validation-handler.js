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
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: errors.array().map((error) => ({
        field: error.path,
        message: error.msg,
      })),
    });
  }

  next();
};
