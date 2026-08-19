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

const mockLogin = mock.fn();
const mockLogout = mock.fn();
mock.module("../interfaces/http/controllers/authentication-controller.js", {
  namedExports: { login: mockLogin, logout: mockLogout },
});

const mockRegister = mock.fn();
const mockUserExists = mock.fn();
const mockUpdateUsername = mock.fn();
const mockUpdatePassword = mock.fn();
const mockDeleteAccount = mock.fn();
const mockGetUserStats = mock.fn();
mock.module("../interfaces/http/controllers/user-controller.js", {
  namedExports: {
    register: mockRegister,
    userExists: mockUserExists,
    updateUsername: mockUpdateUsername,
    updatePassword: mockUpdatePassword,
    deleteAccount: mockDeleteAccount,
    getUserStats: mockGetUserStats,
  },
});

const mockAuthenticateSession = mock.fn();
mock.module("../interfaces/http/middleware/auth-middleware.js", {
  defaultExport: mockAuthenticateSession,
});

const mockDoubleCsrfProtection = mock.fn();
mock.module("../interfaces/http/middleware/csrf-middleware.js", {
  namedExports: { doubleCsrfProtection: mockDoubleCsrfProtection },
});

const mockValidateUserExists = mock.fn();
const mockValidateUserRegistration = mock.fn();
const mockValidateUpdateUsername = mock.fn();
const mockValidateUpdatePassword = mock.fn();
mock.module("../interfaces/http/middleware/validation/user-validation.js", {
  namedExports: {
    validateUserExists: mockValidateUserExists,
    validateUserRegistration: mockValidateUserRegistration,
    validateUpdateUsername: mockValidateUpdateUsername,
    validateUpdatePassword: mockValidateUpdatePassword,
  },
});

const mockValidationHandler = mock.fn();
mock.module("../interfaces/http/middleware/validation/validation-handler.js", {
  namedExports: { validationHandler: mockValidationHandler },
});

const mockValidateLogin = mock.fn();
mock.module(
  "../interfaces/http/middleware/validation/authentication-validation.js",
  { namedExports: { validateLogin: mockValidateLogin } },
);

await import("../interfaces/http/routes/user-routes.js");

function find(method, path) {
  return registrations.find((r) => r.method === method && r.path === path);
}

describe("user-routes wiring", () => {
  it("wires POST /register through validation and the register controller", () => {
    assert.deepStrictEqual(find("post", "/register").handlers, [
      mockValidateUserRegistration,
      mockValidationHandler,
      mockRegister,
    ]);
  });

  it("wires POST /login through the same validation chain as /auth/login", () => {
    assert.deepStrictEqual(find("post", "/login").handlers, [
      mockValidateLogin,
      mockValidationHandler,
      mockLogin,
    ]);
  });

  it("wires POST /logout through CSRF protection to the logout controller", () => {
    assert.deepStrictEqual(find("post", "/logout").handlers, [
      mockDoubleCsrfProtection,
      mockLogout,
    ]);
  });

  it("wires GET /exists through validation and the userExists controller", () => {
    assert.deepStrictEqual(find("get", "/exists").handlers, [
      mockValidateUserExists,
      mockValidationHandler,
      mockUserExists,
    ]);
  });

  it("wires POST /update-username through auth, CSRF, validation, and the controller", () => {
    assert.deepStrictEqual(find("post", "/update-username").handlers, [
      mockAuthenticateSession,
      mockDoubleCsrfProtection,
      mockValidateUpdateUsername,
      mockValidationHandler,
      mockUpdateUsername,
    ]);
  });

  it("wires POST /update-password through auth, CSRF, validation, and the controller", () => {
    assert.deepStrictEqual(find("post", "/update-password").handlers, [
      mockAuthenticateSession,
      mockDoubleCsrfProtection,
      mockValidateUpdatePassword,
      mockValidationHandler,
      mockUpdatePassword,
    ]);
  });

  it("wires DELETE /account through auth and CSRF protection", () => {
    assert.deepStrictEqual(find("delete", "/account").handlers, [
      mockAuthenticateSession,
      mockDoubleCsrfProtection,
      mockDeleteAccount,
    ]);
  });

  it("wires GET /stats through auth to the getUserStats controller", () => {
    assert.deepStrictEqual(find("get", "/stats").handlers, [
      mockAuthenticateSession,
      mockGetUserStats,
    ]);
  });
});
