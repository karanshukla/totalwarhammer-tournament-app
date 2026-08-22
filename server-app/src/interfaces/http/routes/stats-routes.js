import express from "express";

import * as statsController from "../controllers/stats-controller.js";
import { validateGlobalStatsQuery } from "../middleware/validation/stats-validation.js";
import { validationHandler } from "../middleware/validation/validation-handler.js";

const router = express.Router();

router.get(
  "/",
  validateGlobalStatsQuery,
  validationHandler,
  statsController.getStats,
);

export default router;
