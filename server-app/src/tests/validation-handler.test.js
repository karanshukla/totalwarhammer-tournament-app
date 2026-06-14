/**
 * Branch coverage for interfaces/http/middleware/validation/validation-handler.js:
 * - errors.isEmpty()=false → 400 with errors array
 * - errors.isEmpty()=true → next() called
 */
import assert from "node:assert";
import { describe, it, mock } from "node:test";

mock.module("express-validator", {
  namedExports: {
    validationResult: mock.fn((req) => req.__validationResult),
  },
});

const { validationHandler } = await import(
  "../interfaces/http/middleware/validation/validation-handler.js"
);

function mockRes() {
  const res = {};
  res.status = mock.fn(() => res);
  res.json = mock.fn(() => res);
  return res;
}

describe("validationHandler", () => {
  it("returns 400 with formatted errors when validation fails", () => {
    const req = {
      __validationResult: {
        isEmpty: () => false,
        array: () => [{ path: "username", msg: "Required" }],
      },
    };
    const res = mockRes();
    const next = mock.fn();
    validationHandler(req, res, next);
    assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    const body = res.json.mock.calls[0].arguments[0];
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.errors[0].field, "username");
    assert.strictEqual(next.mock.calls.length, 0);
  });

  it("calls next() when validation passes", () => {
    const req = {
      __validationResult: {
        isEmpty: () => true,
        array: () => [],
      },
    };
    const res = mockRes();
    const next = mock.fn();
    validationHandler(req, res, next);
    assert.strictEqual(next.mock.calls.length, 1);
    assert.strictEqual(res.status.mock.calls.length, 0);
  });
});
