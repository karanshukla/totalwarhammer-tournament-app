import mongoose from 'mongoose';
import { mongoUri } from '../config/env.js';

export const connectToDatabase = async () => {
  try {
    await mongoose.connect(mongoUri,
      {
        dbName: 'twta-app',
      }
    );
    console.log('Connected to database successfully');
  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1); 
  }
};