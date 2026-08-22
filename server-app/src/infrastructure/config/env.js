import devConfig from "./environments/development.js";
import prodConfig from "./environments/production.js";
import testConfig from "./environments/test.js";

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

// A trailing slash makes a URL unusable as a CORS `origin` (the browser never
// sends one) and produces `//path` when concatenated into a link, so strip it
// once here rather than at each call site.
const withoutTrailingSlash = (url) =>
  typeof url === "string" ? url.replace(/\/+$/, "") : url;

// Export configuration values
export const port = config.port;
export const mongoUri = config.mongoUri;
export const jwtSecret = config.jwtSecret;
export const sessionSecret = config.sessionSecret;
export const baseUrl = withoutTrailingSlash(config.baseUrl);
export const clientUrl = withoutTrailingSlash(config.clientUrl);
export const resendApiKey = config.resendApiKey;
export const rateLimitGlobalMax = config.rateLimitGlobalMax;
export const rateLimitAuthMax = config.rateLimitAuthMax;
