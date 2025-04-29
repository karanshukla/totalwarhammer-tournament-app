import express from 'express';
import * as userController from '../controllers/user-controller.js';
import authenticateToken from '../middleware/auth-middleware.js'; // Import the middleware

const router = express.Router();

// Public route - no authentication needed
router.post('/register', userController.register);

// Example protected route - requires authentication
// Add more protected user routes here as needed
router.get('/profile', authenticateToken, (req, res) => {
    // Access user info from req.user (added by the middleware)
    res.json({ success: true, user: req.user });
});

export default router;