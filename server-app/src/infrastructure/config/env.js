import dotenv from "dotenv";

import devConfig from "./environments/development.js";
import prodConfig from "./environments/production.js";
import testConfig from "./environments/test.js";

// Load environment variables from .env file
dotenv.config();

// Determine current environment
const environment = process.env.NODE_ENV || "development";

// Load the appropriate configuration based on the environment
let config;
switch (environment) {
  case "production":
    config = prodConfig;
    break;
  case "test":
    config = testConfig;
    break;
  default:
    config = devConfig;
}

// Export configuration values
export const port = config.port;
export const mongoUri = config.mongoUri;
export const jwtSecret = config.jwtSecret;
export const jwtRefreshSecret = config.jwtRefreshSecret;
export const sessionSecret = config.sessionSecret;
export const baseUrl = config.baseUrl;
export const clientUrl = config.clientUrl;
export const resendApiKey = config.resendApiKey;
