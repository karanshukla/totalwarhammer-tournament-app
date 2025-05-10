import mongoose from "mongoose";

// Import configuration which ensures environment variables are loaded via bootstrap.js
import { mongoUri } from "../config/env.js";

const connectOptions = {
  dbName: "twta-app",
};

export const connectToDatabase = async () => {
  try {
    // Use environment variable directly as fallback
    const uri = mongoUri || process.env.MONGO_URI;

    if (!uri) {
      throw new Error("MongoDB URI is not defined. Check your .env file.");
    }

    await mongoose.connect(uri, connectOptions);
    console.log("Connected to database successfully");
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
};
