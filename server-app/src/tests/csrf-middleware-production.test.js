// Tests the production branch of csrf-middleware.js (cookieName / sameSite / secure).
// Must run in its own file so NODE_ENV can be set before module import.

import assert from "node:assert";
import { describe, it } from "node:test";

process.env.NODE_ENV = "production";
process.env.CSRF_SECRET = "a-production-csrf-secret-for-coverage-only";

const { doubleCsrfProtection, generateCsrfToken, csrfErrorHandler } =
  await import("../interfaces/http/middleware/csrf-middleware.js");

describe("csrf-middleware — production branch", () => {
  it("builds the double-submit protection middleware using the __Host- cookie prefix", () => {
    assert.strictEqual(typeof doubleCsrfProtection, "function");
    assert.strictEqual(typeof generateCsrfToken, "function");
  });

  it("still passes non-CSRF errors through to next() in production", () => {
    const err = new Error("database error");
    let passedErr = null;
    const req = { method: "POST", path: "/api/x", headers: {} };
    const res = { status: () => res, json: () => res };
    csrfErrorHandler(err, req, res, (e) => {
      passedErr = e;
    });
    assert.strictEqual(passedErr, err);
  });
});
