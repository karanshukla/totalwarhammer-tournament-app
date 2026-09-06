import path from "path";
import { fileURLToPath } from "url";

import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// server-app/.env, not the repo root — see CLAUDE.md.
const envPath = path.resolve(__dirname, "../../..", ".env");

const result = dotenv.config({ path: envPath, quiet: true });

// Most cloud environments set NODE_ENV=production and inject env vars
// directly, so a missing .env file there is expected, not an error.
const isProduction = process.env.NODE_ENV === "production";

if (result.error) {
  if (isProduction) {
    console.log(
      "Running in production mode. No .env file found, but this is expected if environment variables are set directly by the platform.",
    );
  } else {
    console.warn("Warning: .env file not found at path:", envPath);
    console.log(
      "This is fine if you've set environment variables another way.",
    );
    console.log("Current working directory:", process.cwd());
  }
}

export const initialized = true;
