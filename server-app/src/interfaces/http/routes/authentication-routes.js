import express from 'express';
import * as authenticationController from '../controllers/authentication-controller.js';

const router = express.Router();

router.post('/login', authenticationController.login);
router.post('/logout', authenticationController.logout);

export default router;