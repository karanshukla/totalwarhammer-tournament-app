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

const controllerNames = [
  "getMatchesByTournament",
  "getMatchById",
  "createMatch",
  "reportResult",
  "resolveDispute",
  "recordResult",
  "overrideResult",
  "updateMatchStatus",
];
const mockControllers = Object.fromEntries(
  controllerNames.map((name) => [name, mock.fn()]),
);
mock.module("../interfaces/http/controllers/match-controller.js", {
  namedExports: mockControllers,
});

const mockAuthenticateSession = mock.fn();
mock.module("../interfaces/http/middleware/auth-middleware.js", {
  defaultExport: mockAuthenticateSession,
});

const mockDoubleCsrfProtection = mock.fn();
mock.module("../interfaces/http/middleware/csrf-middleware.js", {
  namedExports: { doubleCsrfProtection: mockDoubleCsrfProtection },
});

await import("../interfaces/http/routes/match-routes.js");

function find(method, path) {
  return registrations.find((r) => r.method === method && r.path === path);
}

describe("match-routes wiring", () => {
  it("wires GET /tournament/:tournamentId directly to getMatchesByTournament", () => {
    assert.deepStrictEqual(find("get", "/tournament/:tournamentId").handlers, [
      mockControllers.getMatchesByTournament,
    ]);
  });

  it("wires GET /:id directly to getMatchById", () => {
    assert.deepStrictEqual(find("get", "/:id").handlers, [
      mockControllers.getMatchById,
    ]);
  });

  it("wires POST / through auth and CSRF protection to createMatch", () => {
    assert.deepStrictEqual(find("post", "/").handlers, [
      mockAuthenticateSession,
      mockDoubleCsrfProtection,
      mockControllers.createMatch,
    ]);
  });

  const patchRoutes = [
    ["/:id/report", "reportResult"],
    ["/:id/resolve", "resolveDispute"],
    ["/:id/result", "recordResult"],
    ["/:id/override", "overrideResult"],
    ["/:id/status", "updateMatchStatus"],
  ];

  for (const [path, controllerName] of patchRoutes) {
    it(`wires PATCH ${path} through auth and CSRF protection to ${controllerName}`, () => {
      assert.deepStrictEqual(find("patch", path).handlers, [
        mockAuthenticateSession,
        mockDoubleCsrfProtection,
        mockControllers[controllerName],
      ]);
    });
  }
});
