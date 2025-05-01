import express from 'express';
import userRoutes from './user-routes.js';
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

export default router;