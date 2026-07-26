import assert from "node:assert";
import { describe, it, mock } from "node:test";

function createRouterMock() {
  const registrations = [];
  const router = {};
  for (const method of ["get", "post", "delete", "patch"]) {
    router[method] = mock.fn((path, ...handlers) => {
      registrations.push({ method, path, handlers });
    });
  }
  return { router, registrations };
}

const { router: routerMock, registrations } = createRouterMock();
mock.module("express", {
  defaultExport: { Router: mock.fn(() => routerMock) },
});

const mockSendPasswordResetEmail = mock.fn();
const mockVerifyResetToken = mock.fn();
const mockResetPassword = mock.fn();
mock.module("../interfaces/http/controllers/password-reset-controller.js", {
  namedExports: {
    sendPasswordResetEmail: mockSendPasswordResetEmail,
    verifyResetToken: mockVerifyResetToken,
    resetPassword: mockResetPassword,
  },
});

const mockValidatePasswordResetEmail = mock.fn();
const mockValidateResetToken = mock.fn();
const mockValidateResetPassword = mock.fn();
mock.module(
  "../interfaces/http/middleware/validation/password-reset-validation.js",
  {
    namedExports: {
      validatePasswordResetEmail: mockValidatePasswordResetEmail,
      validateResetToken: mockValidateResetToken,
      validateResetPassword: mockValidateResetPassword,
    },
  },
);

const mockValidationHandler = mock.fn();
mock.module("../interfaces/http/middleware/validation/validation-handler.js", {
  namedExports: { validationHandler: mockValidationHandler },
});

await import("../interfaces/http/routes/password-reset-routes.js");

function find(method, path) {
  return registrations.find((r) => r.method === method && r.path === path);
}

describe("password-reset-routes wiring", () => {
  it("wires POST /request through validation to sendPasswordResetEmail", () => {
    assert.deepStrictEqual(find("post", "/request").handlers, [
      mockValidatePasswordResetEmail,
      mockValidationHandler,
      mockSendPasswordResetEmail,
    ]);
  });

  it("wires POST /verify through validation to verifyResetToken", () => {
    assert.deepStrictEqual(find("post", "/verify").handlers, [
      mockValidateResetToken,
      mockValidationHandler,
      mockVerifyResetToken,
    ]);
  });

  it("wires POST /reset through validation to resetPassword", () => {
    assert.deepStrictEqual(find("post", "/reset").handlers, [
      mockValidateResetPassword,
      mockValidationHandler,
      mockResetPassword,
    ]);
  });
});
