import SessionService from "../../../infrastructure/services/session-service.js";

const sessionService = new SessionService();

const authenticateSession = async (req, res, next) => {
  // Check if session exists and user is authenticated
  if (!sessionService.isAuthenticated(req)) {
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized: Not authenticated" });
  }

  try {
    // Add user information from session to request object
    req.user = sessionService.getCurrentUser(req);
    next();
  } catch (error) {
    console.error("Session authentication failed:", error.message);
    return res
      .status(403)
      .json({ success: false, message: "Forbidden: Invalid session" });
  }
};

export default authenticateSession;
