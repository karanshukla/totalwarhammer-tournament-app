import express from 'express';
import userRoutes from './user-routes.js';
const router = express.Router();

// Home route
router.get('/', (req, res) => {
  res.send('Welcome to the Total War: Warhammer Tournament App');
});

// API routes
router.use('/api', userRoutes);

export default router;