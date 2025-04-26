import express from 'express';
import { port } from './src/infrastructure/config/env.js';
import { connectToDatabase } from './src/infrastructure/db/connection.js';
import routes from './src/interfaces/http/routes/index.js';
import accessLogger from './src/interfaces/http/middleware/access-logger.js';

// Create Express application
const app = express();

// Connect to database
connectToDatabase();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(accessLogger); // Access logging middleware

// Routes
app.use(routes);

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

export default app;