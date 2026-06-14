/**
 * Branch coverage for interfaces/http/middleware/validation/password-reset-validation.js:
 * validatePasswordResetEmail:
 *   - valid email → pass
 *   - missing email → error
 *   - invalid email format → error
 * validateResetToken:
 *   - valid token → pass
 *   - missing token → error
 *   - token too short → error
 * validateResetPassword:
 *   - valid payload → pass
 *   - missing token → error
 *   - missing newPassword → error
 *   - short newPassword → error
 */
import assert from "node:assert";
import { describe, it } from "node:test";
import { validationResult } from "express-validator";
import {
  validatePasswordResetEmail,
  validateResetToken,
  validateResetPassword,
} from "../interfaces/http/middleware/validation/password-reset-validation.js";

async function runChain(chains, body = {}) {
  const req = { body, query: {}, params: {}, headers: {} };
  for (const v of chains) {
    await v.run(req);
  }
  return validationResult(req);
}

describe("validatePasswordResetEmail", () => {
  it("passes with a valid email", async () => {
    const result = await runChain(validatePasswordResetEmail, {
      email: "user@example.com",
    });
    assert.strictEqual(result.isEmpty(), true);
  });

  it("fails when email is missing", async () => {
    const result = await runChain(validatePasswordResetEmail, {});
    assert.ok(result.array().some((e) => e.path === "email"));
  });

  it("fails with an invalid email format", async () => {
    const result = await runChain(validatePasswordResetEmail, {
      email: "notanemail",
    });
    assert.ok(result.array().some((e) => e.path === "email"));
  });
});

describe("validateResetToken", () => {
  const validToken = "a".repeat(20);

  it("passes with a valid token", async () => {
    const result = await runChain(validateResetToken, { token: validToken });
    assert.strictEqual(result.isEmpty(), true);
  });

  it("fails when token is missing", async () => {
    const result = await runChain(validateResetToken, {});
    assert.ok(result.array().some((e) => e.path === "token"));
  });

  it("fails when token is too short (< 20 chars)", async () => {
    const result = await runChain(validateResetToken, { token: "short" });
    assert.ok(result.array().some((e) => e.path === "token"));
  });
});

describe("validateResetPassword", () => {
  const validToken = "a".repeat(20);

  it("passes with valid token and newPassword", async () => {
    const result = await runChain(validateResetPassword, {
      token: validToken,
      newPassword: "password123",
    });
    assert.strictEqual(result.isEmpty(), true);
  });

  it("fails when token is missing", async () => {
    const result = await runChain(validateResetPassword, {
      newPassword: "password123",
    });
    assert.ok(result.array().some((e) => e.path === "token"));
  });

  it("fails when newPassword is missing", async () => {
    const result = await runChain(validateResetPassword, { token: validToken });
    assert.ok(result.array().some((e) => e.path === "newPassword"));
  });

  it("fails when newPassword is too short (< 8 chars)", async () => {
    const result = await runChain(validateResetPassword, {
      token: validToken,
      newPassword: "short",
    });
    assert.ok(result.array().some((e) => e.path === "newPassword"));
  });
});
