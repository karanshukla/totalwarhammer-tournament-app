import express from 'express';
import * as authenticationController from '../controllers/authentication-controller.js';

const router = express.Router();

router.post('/login', authenticationController.login);
router.post('/logout', authenticationController.logout);
router.post('/token', authenticationController.token); // New endpoint for PKCE token exchange

export default router;