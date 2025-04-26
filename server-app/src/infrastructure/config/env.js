// Configuration file for environment variables
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const port = process.env.PORT || 3000;
export const mongoUri = process.env.MONGO_URI;