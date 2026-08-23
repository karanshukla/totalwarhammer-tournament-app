import dns from "node:dns";

import mongoose from "mongoose";

// Import configuration which ensures environment variables are loaded via bootstrap.js
import { mongoUri } from "../config/env.js";

// Node 24 uses the system resolver for SRV lookups; force public DNS so
// +srv connection strings resolve even when the local resolver blocks them.
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

const connectOptions = {
  dbName: "twt-app",
  // Driver default is 100; this app's traffic doesn't need anywhere near that
  // many idle sockets held open.
  maxPoolSize: 10,
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
