import path from "path";
import { fileURLToPath } from "url";

import dotenv from "dotenv";

// Get the directory path of this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the .env file (three levels up from this file)
const envPath = path.resolve(__dirname, "../../..", ".env");

// Load environment variables from .env file
const result = dotenv.config({ path: envPath });

// Check if we're in production (most cloud environments set this)
const isProduction = process.env.NODE_ENV === "production";

if (result.error) {
  if (isProduction) {
    console.log(
      "Running in production mode. No .env file found, but this is expected if environment variables are set directly by the platform."
    );
  } else {
    console.warn("Warning: .env file not found at path:", envPath);
    console.log(
      "This is fine if you've set environment variables another way."
    );
    console.log("Current working directory:", process.cwd());
  }
}

export const initialized = true;
