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

const mockCreateGuestUser = mock.fn();
const mockUpdateGuestUsername = mock.fn();
mock.module("../interfaces/http/controllers/guest-controller.js", {
  namedExports: {
    createGuestUser: mockCreateGuestUser,
    updateGuestUsername: mockUpdateGuestUsername,
  },
});

const mockAuthenticateGuestSession = mock.fn();
mock.module("../interfaces/http/middleware/auth-middleware.js", {
  namedExports: { authenticateGuestSession: mockAuthenticateGuestSession },
});

const mockValidateGuestUsername = mock.fn();
mock.module("../interfaces/http/middleware/validation/user-validation.js", {
  namedExports: { validateGuestUsername: mockValidateGuestUsername },
});

const mockValidationHandler = mock.fn();
mock.module("../interfaces/http/middleware/validation/validation-handler.js", {
  namedExports: { validationHandler: mockValidationHandler },
});

await import("../interfaces/http/routes/guest-routes.js");

function find(method, path) {
  return registrations.find((r) => r.method === method && r.path === path);
}

describe("guest-routes wiring", () => {
  it("wires POST / directly to createGuestUser", () => {
    assert.deepStrictEqual(find("post", "/").handlers, [mockCreateGuestUser]);
  });

  it("wires POST /username through auth, validation, and updateGuestUsername", () => {
    assert.deepStrictEqual(find("post", "/username").handlers, [
      mockAuthenticateGuestSession,
      mockValidateGuestUsername,
      mockValidationHandler,
      mockUpdateGuestUsername,
    ]);
  });
});
