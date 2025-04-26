// Database connection utility
import mongoose from 'mongoose';
import { mongoUri } from '../config/env.js';

// Database connection function
export const connectToDatabase = async () => {
  try {
    // Using modern connection approach without deprecated options
    await mongoose.connect(mongoUri);
    console.log('Connected to database successfully');
  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1); // Exit process with failure
  }
};