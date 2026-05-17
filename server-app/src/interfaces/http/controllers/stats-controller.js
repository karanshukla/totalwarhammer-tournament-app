import { getGlobalStats } from "../../../infrastructure/services/stats-service.js";
import logger from "../../../infrastructure/utils/logger.js";

/** @type {import('express').RequestHandler} */
export const getStats = async (_req, res) => {
  try {
    const data = await getGlobalStats();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    logger.error(`Stats error: ${error.message}`, { error });
    return res.status(500).json({
      success: false,
      message: "Failed to fetch statistics",
      error: error.message,
    });
  }
};
