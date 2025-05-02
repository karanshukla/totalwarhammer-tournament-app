import express from 'express';
import * as userController from '../controllers/user-controller.js';
import * as authenticationController from '../controllers/authentication-controller.js';
import authenticateToken from '../middleware/auth-middleware.js'; // Import the middleware

const router = express.Router();

// Public route - no authentication needed
router.post('/register', userController.register);
router.post('/login', authenticationController.login);
router.post('/logout', authenticationController.logout);
router.get('/exists', userController.userExists);
router.post('/guest', userController.createGuestUser); 

export default router;