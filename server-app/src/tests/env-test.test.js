/**
 * Tests the "test" branch of infrastructure/config/env.js.
 * Sets NODE_ENV = "test" before importing the module so the test config is used.
 */
import assert from "node:assert";
import { describe, it } from "node:test";

process.env.NODE_ENV = "test";

const envModule = await import("../infrastructure/config/env.js");

describe("env.js – test branch", () => {
  it("exports port from test config", () => {
    assert.ok(envModule.port !== undefined);
  });

  it("exports mongoUri from test config", () => {
    assert.ok(typeof envModule.mongoUri === "string");
    assert.ok(envModule.mongoUri.includes("test_db") || envModule.mongoUri.includes("localhost"));
  });

  it("exports jwtSecret from test config", () => {
    assert.ok(typeof envModule.jwtSecret === "string");
  });

  it("exports sessionSecret from test config", () => {
    assert.ok(typeof envModule.sessionSecret === "string");
  });

  it("exports baseUrl from test config", () => {
    assert.ok(typeof envModule.baseUrl === "string");
  });

  it("exports clientUrl from test config", () => {
    assert.ok(typeof envModule.clientUrl === "string");
  });
});
