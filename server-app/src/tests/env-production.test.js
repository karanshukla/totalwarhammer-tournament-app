// Tests the production and test branches of env.js.
// Must run in its own file so NODE_ENV can be set before module import.

import assert from "node:assert";
import { describe, it } from "node:test";

// Set to production before importing env.js so the production branch is taken
process.env.NODE_ENV = "production";
process.env.PORT = "8080";
process.env.MONGO_URI = "mongodb://prod-host:27017/prod_db";
process.env.SESSION_SECRET = "prod-session-secret";
process.env.BASE_URL = "https://prod.example.com";
process.env.CLIENT_URL = "https://app.example.com";
process.env.RESEND_API_KEY = "resend-prod-key";

const envModule = await import("../infrastructure/config/env.js");

describe("env.js – production branch", () => {
  it("exports port from production config", () => {
    assert.strictEqual(envModule.port, "8080");
  });

  it("exports mongoUri from production config", () => {
    assert.strictEqual(envModule.mongoUri, "mongodb://prod-host:27017/prod_db");
  });

  it("exports sessionSecret from production config", () => {
    assert.strictEqual(envModule.sessionSecret, "prod-session-secret");
  });

  it("exports baseUrl from production config", () => {
    assert.strictEqual(envModule.baseUrl, "https://prod.example.com");
  });

  it("exports clientUrl from production config", () => {
    assert.strictEqual(envModule.clientUrl, "https://app.example.com");
  });

  it("exports resendApiKey from production config", () => {
    assert.strictEqual(envModule.resendApiKey, "resend-prod-key");
  });
});
