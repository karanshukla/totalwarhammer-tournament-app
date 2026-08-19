import assert from "node:assert";
import { describe, it, mock } from "node:test";

function createRouterMock() {
  const registrations = [];
  const router = {};
  for (const method of ["get", "post", "delete"]) {
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

const mockLoggerInfo = mock.fn();
mock.module("../infrastructure/utils/logger.js", {
  defaultExport: { info: mockLoggerInfo, debug: mock.fn(), error: mock.fn() },
});

const mockLogin = mock.fn();
const mockLogout = mock.fn();
const mockToken = mock.fn();
mock.module("../interfaces/http/controllers/authentication-controller.js", {
  namedExports: { login: mockLogin, logout: mockLogout, token: mockToken },
});

const mockGenerateCsrfToken = mock.fn(() => "csrf-token-value");
mock.module("../interfaces/http/middleware/csrf-middleware.js", {
  namedExports: { generateCsrfToken: mockGenerateCsrfToken },
});

const mockValidateLogin = mock.fn();
const mockValidateToken = mock.fn();
mock.module(
  "../interfaces/http/middleware/validation/authentication-validation.js",
  {
    namedExports: {
      validateLogin: mockValidateLogin,
      validateToken: mockValidateToken,
    },
  },
);

const mockValidationHandler = mock.fn();
mock.module("../interfaces/http/middleware/validation/validation-handler.js", {
  namedExports: { validationHandler: mockValidationHandler },
});

await import("../interfaces/http/routes/authentication-routes.js");

function find(method, path) {
  return registrations.find((r) => r.method === method && r.path === path);
}

describe("authentication-routes wiring", () => {
  it("wires POST /login through validation and the login controller", () => {
    const registration = find("post", "/login");
    assert.deepStrictEqual(registration.handlers, [
      mockValidateLogin,
      mockValidationHandler,
      mockLogin,
    ]);
  });

  it("wires POST and DELETE /logout directly to the logout controller", () => {
    assert.deepStrictEqual(find("post", "/logout").handlers, [mockLogout]);
    assert.deepStrictEqual(find("delete", "/logout").handlers, [mockLogout]);
  });

  it("wires POST /token through validation and the token controller", () => {
    const registration = find("post", "/token");
    assert.deepStrictEqual(registration.handlers, [
      mockValidateToken,
      mockValidationHandler,
      mockToken,
    ]);
  });

  describe("GET /csrf-token handler", () => {
    function getCsrfHandler() {
      return find("get", "/csrf-token").handlers[0];
    }

    it("initializes the session and returns a CSRF token", () => {
      const handler = getCsrfHandler();
      const req = { session: {} };
      const jsonCalls = [];
      const res = { json: (body) => jsonCalls.push(body) };

      handler(req, res);

      assert.strictEqual(req.session.initialized, true);
      assert.ok(req.session.createdAt);
      assert.deepStrictEqual(jsonCalls[0], { csrfToken: "csrf-token-value" });
    });

    it("does not reset createdAt on an already-initialized session", () => {
      const handler = getCsrfHandler();
      const req = { session: { initialized: true, createdAt: 42 } };
      const res = { json: () => {} };

      handler(req, res);

      assert.strictEqual(req.session.createdAt, 42);
    });

    it("responds with 500 when token generation throws", () => {
      const handler = getCsrfHandler();
      mockGenerateCsrfToken.mock.mockImplementationOnce(() => {
        throw new Error("csrf secret missing");
      });
      const req = { session: {} };
      const statusCalls = [];
      const jsonCalls = [];
      const res = {
        status: (code) => {
          statusCalls.push(code);
          return { json: (body) => jsonCalls.push(body) };
        },
        json: () => {},
      };

      handler(req, res);

      assert.deepStrictEqual(statusCalls, [500]);
      assert.deepStrictEqual(jsonCalls[0], {
        error: "Failed to generate CSRF token",
      });
    });
  });
});
