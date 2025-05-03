import express from "express";

import * as authenticationController from "../controllers/authentication-controller.js";
import {
  validateLogin,
  validateToken,
} from "../middleware/validation/authentication-validation.js";
import { validationHandler } from "../middleware/validation/validation-handler.js";

const router = express.Router();

router.post(
  "/login",
  validateLogin,
  validationHandler,
  authenticationController.login
);
router.post("/logout", authenticationController.logout);
router.post(
  "/token",
  validateToken,
  validationHandler,
  authenticationController.token
);

export default router;
