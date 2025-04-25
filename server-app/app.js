// ...existing code...
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');

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

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  password: { type: String, required: true },
  email: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

//Model Definitions
const User = mongoose.model('User', userSchema);
const AccessLog = mongoose.model('AccessLog', accessLogSchema);

// Middleware to log IP address
app.use(async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.remoteAddress;
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

app.post('/api/register', async (req, res) => {
  const { username, password, email } = req.body;
  try {
    const newUser = new User({ username, password, email });
    newUser.password = await bcrypt.hash(password, 10);
    await newUser.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error('Error registering user:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
);

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});