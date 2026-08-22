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

const mockValidateGlobalStatsQuery = mock.fn();
mock.module("../interfaces/http/middleware/validation/stats-validation.js", {
  namedExports: { validateGlobalStatsQuery: mockValidateGlobalStatsQuery },
});

const mockValidationHandler = mock.fn();
mock.module("../interfaces/http/middleware/validation/validation-handler.js", {
  namedExports: { validationHandler: mockValidationHandler },
});

const mockGetStats = mock.fn();
mock.module("../interfaces/http/controllers/stats-controller.js", {
  namedExports: { getStats: mockGetStats },
});

await import("../interfaces/http/routes/stats-routes.js");

describe("stats-routes wiring", () => {
  it("wires GET / through query validation to getStats", () => {
    const registration = registrations.find(
      (r) => r.method === "get" && r.path === "/",
    );
    assert.deepStrictEqual(registration.handlers, [
      mockValidateGlobalStatsQuery,
      mockValidationHandler,
      mockGetStats,
    ]);
  });
});
