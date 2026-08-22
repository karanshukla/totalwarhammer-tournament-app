import { query } from "express-validator";

import {
  MAX_LIST_LIMIT,
  STATS_RANGES,
} from "../../../../infrastructure/services/stats-service.js";

/**
 * Shared query contract for the global and per-user statistics endpoints.
 * All params are optional; omitting them yields the historical response.
 */
const statsQueryChain = [
  query("range")
    .optional()
    .isIn(STATS_RANGES)
    .withMessage(`Range must be one of: ${STATS_RANGES.join(", ")}`),

  query("limit")
    .optional()
    .isInt({ min: 1, max: MAX_LIST_LIMIT })
    .withMessage(`Limit must be between 1 and ${MAX_LIST_LIMIT}`)
    .toInt(),

  query("offset")
    .optional()
    .isInt({ min: 0, max: MAX_LIST_LIMIT })
    .withMessage(`Offset must be between 0 and ${MAX_LIST_LIMIT}`)
    .toInt(),
];

/** @type {import('express-validator').ValidationChain[]} */
export const validateGlobalStatsQuery = statsQueryChain;

/** @type {import('express-validator').ValidationChain[]} */
export const validateUserStatsQuery = [
  ...statsQueryChain,

  query("detail")
    .optional()
    .isIn(["summary", "full"])
    .withMessage("Detail must be one of: summary, full"),
];
