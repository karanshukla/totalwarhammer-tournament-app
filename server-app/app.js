// ...existing code...
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Create an instance of the Express application
const app = express();

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define the schema and model for access_logs
const accessLogSchema = new mongoose.Schema({
  ipAddress: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const AccessLog = mongoose.model('AccessLog', accessLogSchema);

// Middleware to log IP address
app.use(async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress;
    await AccessLog.create({ ipAddress });
    console.log(`Logged IP: ${ipAddress}`);
  } catch (err) {
    console.error('Error logging IP address:', err);
  }
  next();
});

// Import routes
const port = process.env.PORT || 3000;

// Middleware for parsing JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from 'public' directory
app.use(express.static('public'));

// Routes
app.get('/', (req, res) => {
  res.send('Welcome to the Total War: Warhammer Tournament App');
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});