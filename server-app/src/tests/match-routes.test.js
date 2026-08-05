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

const validationNames = [
  "validateMatchIdParam",
  "validateTournamentIdParam",
  "validateCreateMatch",
  "validateReportResult",
  "validateResolveDispute",
  "validateRecordResult",
  "validateOverrideResult",
  "validateUpdateMatchStatus",
];
const mockValidators = Object.fromEntries(
  validationNames.map((name) => [name, mock.fn()]),
);
mock.module("../interfaces/http/middleware/validation/match-validation.js", {
  namedExports: mockValidators,
});

const mockValidationHandler = mock.fn();
mock.module("../interfaces/http/middleware/validation/validation-handler.js", {
  namedExports: { validationHandler: mockValidationHandler },
});

await import("../interfaces/http/routes/match-routes.js");

function find(method, path) {
  return registrations.find((r) => r.method === method && r.path === path);
}

describe("match-routes wiring", () => {
  it("wires GET /tournament/:tournamentId through ID validation to getMatchesByTournament", () => {
    assert.deepStrictEqual(find("get", "/tournament/:tournamentId").handlers, [
      mockValidators.validateTournamentIdParam,
      mockValidationHandler,
      mockControllers.getMatchesByTournament,
    ]);
  });

  it("wires GET /:id through ID validation to getMatchById", () => {
    assert.deepStrictEqual(find("get", "/:id").handlers, [
      mockValidators.validateMatchIdParam,
      mockValidationHandler,
      mockControllers.getMatchById,
    ]);
  });

  it("wires POST / through auth, CSRF, and validation to createMatch", () => {
    assert.deepStrictEqual(find("post", "/").handlers, [
      mockAuthenticateSession,
      mockDoubleCsrfProtection,
      mockValidators.validateCreateMatch,
      mockValidationHandler,
      mockControllers.createMatch,
    ]);
  });

  const patchRoutes = [
    ["/:id/report", "reportResult", "validateReportResult"],
    ["/:id/resolve", "resolveDispute", "validateResolveDispute"],
    ["/:id/result", "recordResult", "validateRecordResult"],
    ["/:id/override", "overrideResult", "validateOverrideResult"],
    ["/:id/status", "updateMatchStatus", "validateUpdateMatchStatus"],
  ];

  for (const [path, controllerName, validatorName] of patchRoutes) {
    it(`wires PATCH ${path} through auth, CSRF, and validation to ${controllerName}`, () => {
      assert.deepStrictEqual(find("patch", path).handlers, [
        mockAuthenticateSession,
        mockDoubleCsrfProtection,
        mockValidators[validatorName],
        mockValidationHandler,
        mockControllers[controllerName],
      ]);
    });
  }
});
