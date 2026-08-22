import { getGlobalStats } from "../../../infrastructure/services/stats-service.js";
import logger from "../../../infrastructure/utils/logger.js";

/** @type {import('express').RequestHandler} */
export const getStats = async (req, res) => {
  try {
    const { range, limit, offset } = req.query;
    const data = await getGlobalStats({ range, limit, offset });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    logger.error(`Stats error: ${error.message}`, { error });
    return res.status(500).json({
      success: false,
      message: "Failed to fetch statistics",
    });
  }
};
