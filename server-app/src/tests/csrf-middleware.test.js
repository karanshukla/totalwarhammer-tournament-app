/**
 * Branch coverage for interfaces/http/middleware/csrf-middleware.js:
 * csrfPrerequisiteCheck:
 *   - always calls next() (no branches)
 * csrfErrorHandler:
 *   - req.method === "OPTIONS" → next() (skip CSRF)
 *   - err === invalidCsrfTokenError → 403
 *   - else → next(err) (pass through other errors)
 */
import assert from "node:assert";
import { describe, it } from "node:test";

const { csrfPrerequisiteCheck, csrfErrorHandler, invalidCsrfTokenError } =
  await import("../interfaces/http/middleware/csrf-middleware.js");

function mockRes() {
  const res = {};
  res.status = () => res;
  res.json = () => res;
  return res;
}

describe("csrfPrerequisiteCheck", () => {
  it("always calls next()", () => {
    let called = false;
    const req = { session: { id: "s1" } };
    csrfPrerequisiteCheck(req, mockRes(), () => {
      called = true;
    });
    assert.strictEqual(called, true);
  });

  it("calls next() even without session", () => {
    let called = false;
    csrfPrerequisiteCheck({}, mockRes(), () => {
      called = true;
    });
    assert.strictEqual(called, true);
  });
});

describe("csrfErrorHandler", () => {
  it("calls next() for OPTIONS requests (skip CSRF check)", () => {
    let nextCalled = false;
    const req = { method: "OPTIONS", path: "/api/x", headers: {} };
    const res = mockRes();
    csrfErrorHandler(new Error("any"), req, res, () => {
      nextCalled = true;
    });
    assert.strictEqual(nextCalled, true);
  });

  it("returns 403 when err is invalidCsrfTokenError", () => {
    let status403 = false;
    const res = {
      status: (s) => { status403 = s === 403; return res; },
      json: () => res,
    };
    const req = { method: "POST", path: "/api/x", headers: {} };
    csrfErrorHandler(invalidCsrfTokenError, req, res, () => {});
    assert.strictEqual(status403, true);
  });

  it("passes through non-CSRF errors to next(err)", () => {
    const err = new Error("database error");
    let passedErr = null;
    const req = { method: "POST", path: "/api/x", headers: {} };
    csrfErrorHandler(err, req, mockRes(), (e) => {
      passedErr = e;
    });
    assert.strictEqual(passedErr, err);
  });
});
