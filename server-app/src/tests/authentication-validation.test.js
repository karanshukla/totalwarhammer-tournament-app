/**
 * Branch coverage for interfaces/http/middleware/validation/authentication-validation.js:
 * validateLogin:
 *   - identifier missing → error
 *   - identifier too short (<3) → error
 *   - identifier too long (>100) → error
 *   - password missing → error
 *   - codeChallenge too short (<43) → error
 *   - codeChallengeMethod not S256 → error
 *   - valid minimal payload → pass
 *   - valid full PKCE payload → pass
 * validateToken:
 *   - grant_type missing → error
 *   - grant_type not authorization_code → error
 *   - code missing → error
 *   - code too short → error
 *   - code_verifier missing → error
 *   - code_verifier too short → error
 *   - valid payload → pass
 */
import assert from "node:assert";
import { describe, it } from "node:test";
import { validationResult } from "express-validator";
import {
  validateLogin,
  validateToken,
} from "../interfaces/http/middleware/validation/authentication-validation.js";

async function runChain(chains, body, query = {}) {
  const req = { body, query, params: {}, headers: {} };
  for (const v of chains) {
    await v.run(req);
  }
  return validationResult(req);
}

describe("validateLogin", () => {
  it("passes with a valid minimal login body", async () => {
    const result = await runChain(validateLogin, {
      identifier: "warrior",
      password: "secret",
    });
    assert.strictEqual(result.isEmpty(), true);
  });

  it("fails when identifier is missing", async () => {
    const result = await runChain(validateLogin, { password: "secret" });
    assert.ok(result.array().some((e) => e.path === "identifier"));
  });

  it("fails when identifier is too short", async () => {
    const result = await runChain(validateLogin, { identifier: "ab", password: "secret" });
    assert.ok(result.array().some((e) => e.path === "identifier"));
  });

  it("fails when identifier is too long", async () => {
    const result = await runChain(validateLogin, {
      identifier: "a".repeat(101),
      password: "secret",
    });
    assert.ok(result.array().some((e) => e.path === "identifier"));
  });

  it("fails when password is missing", async () => {
    const result = await runChain(validateLogin, { identifier: "warrior" });
    assert.ok(result.array().some((e) => e.path === "password"));
  });

  it("fails when codeChallenge is too short", async () => {
    const result = await runChain(validateLogin, {
      identifier: "warrior",
      password: "secret",
      codeChallenge: "tooshort",
      codeChallengeMethod: "S256",
    });
    assert.ok(result.array().some((e) => e.path === "codeChallenge"));
  });

  it("fails when codeChallengeMethod is not S256", async () => {
    const result = await runChain(validateLogin, {
      identifier: "warrior",
      password: "secret",
      codeChallenge: "a".repeat(43),
      codeChallengeMethod: "plain",
    });
    assert.ok(result.array().some((e) => e.path === "codeChallengeMethod"));
  });

  it("passes with valid full PKCE payload", async () => {
    const result = await runChain(validateLogin, {
      identifier: "warrior",
      password: "secret",
      codeChallenge: "a".repeat(43),
      codeChallengeMethod: "S256",
      state: "randomstate",
      rememberMe: true,
    });
    assert.strictEqual(result.isEmpty(), true);
  });
});

describe("validateToken", () => {
  const validVerifier = "v".repeat(43);

  it("passes with a valid token body", async () => {
    const result = await runChain(validateToken, {
      grant_type: "authorization_code",
      code: "validcode12345",
      code_verifier: validVerifier,
    });
    assert.strictEqual(result.isEmpty(), true);
  });

  it("fails when grant_type is missing", async () => {
    const result = await runChain(validateToken, {
      code: "validcode12345",
      code_verifier: validVerifier,
    });
    assert.ok(result.array().some((e) => e.path === "grant_type"));
  });

  it("fails when grant_type is not authorization_code", async () => {
    const result = await runChain(validateToken, {
      grant_type: "client_credentials",
      code: "validcode12345",
      code_verifier: validVerifier,
    });
    assert.ok(result.array().some((e) => e.path === "grant_type"));
  });

  it("fails when code is missing", async () => {
    const result = await runChain(validateToken, {
      grant_type: "authorization_code",
      code_verifier: validVerifier,
    });
    assert.ok(result.array().some((e) => e.path === "code"));
  });

  it("fails when code is too short (< 10 chars)", async () => {
    const result = await runChain(validateToken, {
      grant_type: "authorization_code",
      code: "short",
      code_verifier: validVerifier,
    });
    assert.ok(result.array().some((e) => e.path === "code"));
  });

  it("fails when code_verifier is missing", async () => {
    const result = await runChain(validateToken, {
      grant_type: "authorization_code",
      code: "validcode12345",
    });
    assert.ok(result.array().some((e) => e.path === "code_verifier"));
  });

  it("fails when code_verifier is too short (< 43 chars)", async () => {
    const result = await runChain(validateToken, {
      grant_type: "authorization_code",
      code: "validcode12345",
      code_verifier: "short",
    });
    assert.ok(result.array().some((e) => e.path === "code_verifier"));
  });
});
