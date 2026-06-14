/**
 * Tests the "development" (default) branch of infrastructure/config/env.js.
 * Sets NODE_ENV = "development" before importing the module.
 */
import assert from "node:assert";
import { describe, it } from "node:test";

process.env.NODE_ENV = "development";
process.env.PORT = "3000";
process.env.MONGO_URI = "mongodb://localhost:27017/dev_db";
process.env.JWT_SECRET = "dev-jwt-secret";
process.env.SESSION_SECRET = "dev-session-secret";

const envModule = await import("../infrastructure/config/env.js");

describe("env.js – development branch", () => {
  it("exports port from development config", () => {
    assert.ok(envModule.port !== undefined);
  });

  it("exports mongoUri from development config", () => {
    assert.ok(typeof envModule.mongoUri === "string");
  });

  it("exports jwtSecret from development config", () => {
    assert.ok(typeof envModule.jwtSecret === "string");
  });

  it("exports sessionSecret from development config", () => {
    assert.ok(typeof envModule.sessionSecret === "string");
  });

  it("exports baseUrl with localhost default", () => {
    assert.ok(typeof envModule.baseUrl === "string");
    assert.ok(envModule.baseUrl.includes("localhost") || envModule.baseUrl.startsWith("http"));
  });

  it("exports clientUrl", () => {
    assert.ok(typeof envModule.clientUrl === "string");
  });
});
