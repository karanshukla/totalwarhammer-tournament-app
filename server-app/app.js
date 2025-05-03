import cookieParser from 'cookie-parser';
import express from 'express';
import { rateLimit } from 'express-rate-limit'

import { port } from './src/infrastructure/config/env.js';
import { connectToDatabase } from './src/infrastructure/db/connection.js';
import routes from './src/interfaces/http/routes/index.js';

// Create Express application
const app = express();

// Connect to database
connectToDatabase();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(cookieParser());

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, //15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter)

// Routes
app.use(routes);

// Start server
app.listen(port, '::', () => {
  console.log(`Server listening on [::]${port}`);
});

export default app;