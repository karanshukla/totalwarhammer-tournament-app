import JwtService from '../../../infrastructure/services/jwt-service.js';
import User from '../../../domain/models/user.js'; // Optional: To fetch user details if needed

const jwtService = new JwtService();

const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) {
        return res.status(401).json({ success: false, message: 'Unauthorized: No token provided' });
    }

    try {
        const decoded = jwtService.verifyToken(token);
        // Optional: Fetch user from DB if you need more user details than what's in the token
        // const user = await User.findById(decoded.id);
        // if (!user) {
        //     return res.status(403).json({ success: false, message: 'Forbidden: User not found' });
        // }
        // req.user = user; // Attach full user object
        req.user = decoded; // Attach decoded payload (e.g., { id: '...', email: '...' })
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
