import express from 'express';
import userRoutes from './user-routes.js';
import authRoutes from './authentication-routes.js'; // Import auth routes
import cors from 'cors';
import { clientUrl } from '../../../infrastructure/config/env.js';
const router = express.Router();

const corsOptions = {
  origin: clientUrl,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  preflightContinue: false,
  optionsSuccessStatus: 204,
  credentials: true  // Add this line to support credentials (cookies)
};

router.use(cors(corsOptions));
router.use(express.json());

router.get('/', (req, res) => {
  res.redirect(clientUrl);
});

router.use('/user', userRoutes);
router.use('/auth', authRoutes); // Add auth routes under /auth prefix

export default router;