/**
 * Branch coverage for interfaces/http/middleware/validation/user-validation.js:
 * validateUserExists:
 *   - identifier missing → error
 *   - identifier too short → error
 *   - valid identifier → pass
 * validateUserRegistration:
 *   - all valid → pass
 *   - username missing → error
 *   - username invalid chars → error
 *   - email invalid → error
 *   - password too short → error
 * validateGuestUsername:
 *   - valid → pass
 *   - invalid chars → error
 * validateUpdateUsername:
 *   - valid → pass
 *   - too long → error
 * validateUpdatePassword:
 *   - valid → pass
 *   - currentPassword missing → error
 *   - newPassword too short → error
 *   - confirmPassword mismatch → error
 */
import assert from "node:assert";
import { describe, it } from "node:test";
import { validationResult } from "express-validator";
import {
  validateUserExists,
  validateUserRegistration,
  validateGuestUsername,
  validateUpdateUsername,
  validateUpdatePassword,
} from "../interfaces/http/middleware/validation/user-validation.js";

async function runChain(chains, body = {}, query = {}) {
  const req = { body, query, params: {}, headers: {} };
  for (const v of chains) {
    await v.run(req);
  }
  return validationResult(req);
}

describe("validateUserExists", () => {
  it("passes with a valid identifier query param", async () => {
    const result = await runChain(validateUserExists, {}, { identifier: "warrior" });
    assert.strictEqual(result.isEmpty(), true);
  });

  it("fails when identifier is missing", async () => {
    const result = await runChain(validateUserExists, {}, {});
    assert.ok(result.array().some((e) => e.path === "identifier"));
  });

  it("fails when identifier is too short", async () => {
    const result = await runChain(validateUserExists, {}, { identifier: "ab" });
    assert.ok(result.array().some((e) => e.path === "identifier"));
  });
});

describe("validateUserRegistration", () => {
  const valid = {
    username: "warrior_42",
    email: "test@example.com",
    password: "secret123",
  };

  it("passes with all valid fields", async () => {
    const result = await runChain(validateUserRegistration, valid);
    assert.strictEqual(result.isEmpty(), true);
  });

  it("fails when username is missing", async () => {
    const result = await runChain(validateUserRegistration, {
      email: valid.email,
      password: valid.password,
    });
    assert.ok(result.array().some((e) => e.path === "username"));
  });

  it("fails when username contains invalid characters", async () => {
    const result = await runChain(validateUserRegistration, {
      ...valid,
      username: "bad name!",
    });
    assert.ok(result.array().some((e) => e.path === "username"));
  });

  it("fails when email is not valid", async () => {
    const result = await runChain(validateUserRegistration, {
      ...valid,
      email: "notanemail",
    });
    assert.ok(result.array().some((e) => e.path === "email"));
  });

  it("fails when password is too short", async () => {
    const result = await runChain(validateUserRegistration, {
      ...valid,
      password: "short",
    });
    assert.ok(result.array().some((e) => e.path === "password"));
  });
});

describe("validateGuestUsername", () => {
  it("passes with a valid username", async () => {
    const result = await runChain(validateGuestUsername, { username: "guest_hero" });
    assert.strictEqual(result.isEmpty(), true);
  });

  it("fails when username has invalid chars (spaces)", async () => {
    const result = await runChain(validateGuestUsername, { username: "guest hero" });
    assert.ok(result.array().some((e) => e.path === "username"));
  });
});

describe("validateUpdateUsername", () => {
  it("passes with a valid username", async () => {
    const result = await runChain(validateUpdateUsername, { username: "NewName" });
    assert.strictEqual(result.isEmpty(), true);
  });

  it("fails when username exceeds 30 characters", async () => {
    const result = await runChain(validateUpdateUsername, {
      username: "a".repeat(31),
    });
    assert.ok(result.array().some((e) => e.path === "username"));
  });
});

describe("validateUpdatePassword", () => {
  const valid = {
    currentPassword: "oldpass123",
    newPassword: "newpass123",
    confirmPassword: "newpass123",
  };

  it("passes with all valid fields", async () => {
    const result = await runChain(validateUpdatePassword, valid);
    assert.strictEqual(result.isEmpty(), true);
  });

  it("fails when currentPassword is missing", async () => {
    const result = await runChain(validateUpdatePassword, {
      newPassword: "newpass123",
      confirmPassword: "newpass123",
    });
    assert.ok(result.array().some((e) => e.path === "currentPassword"));
  });

  it("fails when newPassword is too short", async () => {
    const result = await runChain(validateUpdatePassword, {
      ...valid,
      newPassword: "short",
      confirmPassword: "short",
    });
    assert.ok(result.array().some((e) => e.path === "newPassword"));
  });

  it("fails when confirmPassword does not match newPassword", async () => {
    const result = await runChain(validateUpdatePassword, {
      ...valid,
      confirmPassword: "differentpassword",
    });
    assert.ok(result.array().some((e) => e.path === "confirmPassword"));
  });
});
