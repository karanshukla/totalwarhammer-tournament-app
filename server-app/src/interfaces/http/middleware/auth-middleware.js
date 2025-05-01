import JwtService from '../../../infrastructure/services/jwt-service.js';
import User from '../../../domain/models/user.js'; // Optional: To fetch user details if needed

const jwtService = new JwtService();

const authenticateToken = async (req, res, next) => {
    let token = req.cookies.jwt;

    if (!token) {
        const authHeader = req.headers['authorization'];
        token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    }

    if (token == null) {
        return res.status(401).json({ success: false, message: 'Unauthorized: No token provided' });
    }

    try {
        const decoded = jwtService.verifyToken(token);
        req.user = decoded; 
        next();
    } catch (error) {
        console.error("Token verification failed:", error.message);
        // Differentiate between expired token and invalid token if needed
        if (error.name === 'TokenExpiredError') {
             return res.status(401).json({ success: false, message: 'Unauthorized: Token expired' });
        }
        return res.status(403).json({ success: false, message: 'Forbidden: Invalid token' });
    }
};

export default authenticateToken;
