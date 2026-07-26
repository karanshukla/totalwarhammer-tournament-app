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

const mockGetStats = mock.fn();
mock.module("../interfaces/http/controllers/stats-controller.js", {
  namedExports: { getStats: mockGetStats },
});

await import("../interfaces/http/routes/stats-routes.js");

describe("stats-routes wiring", () => {
  it("wires GET / directly to getStats", () => {
    const registration = registrations.find(
      (r) => r.method === "get" && r.path === "/",
    );
    assert.deepStrictEqual(registration.handlers, [mockGetStats]);
  });
});
