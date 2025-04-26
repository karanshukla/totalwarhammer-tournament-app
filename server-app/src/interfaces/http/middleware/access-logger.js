// Access logger middleware
import AccessLog from '../../../domain/models/access-log.js';

const accessLogger = async (req, res, next) => {
  try {
    // Create access log entry
    await AccessLog.create({
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date()
    });
    
    next();
  } catch (error) {
    console.error('Error logging access:', error);
    next(); // Continue even if logging fails
  }
};

export default accessLogger;