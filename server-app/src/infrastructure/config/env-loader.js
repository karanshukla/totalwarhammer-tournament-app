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

if (result.error) {
  console.warn(
    `Warning: .env file not found or has syntax errors. Environment variables may not be properly loaded.`,
    result.error
  );
}

// Export something to ensure the module is executed when imported
export const initialized = true;
