import dotenv from 'dotenv';

dotenv.config();

export const port = process.env.PORT || 3000;
export const mongoUri = process.env.MONGO_URI;
export const jwtSecret = process.env.JWT_SECRET;
export const baseUrl = process.env.BASE_URL || 'http://localhost:3000/';
export const clientUrl = process.env.CLIENT_URL || 'http://localhost:3001/';
