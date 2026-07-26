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
  "getTournaments",
  "createTournament",
  "getUserTournaments",
  "getTournamentByCode",
  "getTournamentById",
  "addParticipant",
  "updateParticipant",
  "removeParticipant",
  "joinTournament",
  "startTournament",
  "advanceRound",
  "updateDescription",
  "deleteTournament",
];
const mockControllers = Object.fromEntries(
  controllerNames.map((name) => [name, mock.fn()]),
);
mock.module("../interfaces/http/controllers/tournament-controller.js", {
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

const mockValidateCreateTournament = mock.fn();
mock.module(
  "../interfaces/http/middleware/validation/tournament-validation.js",
  { namedExports: { validateCreateTournament: mockValidateCreateTournament } },
);

const mockValidationHandler = mock.fn();
mock.module("../interfaces/http/middleware/validation/validation-handler.js", {
  namedExports: { validationHandler: mockValidationHandler },
});

await import("../interfaces/http/routes/tournament-routes.js");

function find(method, path) {
  return registrations.find((r) => r.method === method && r.path === path);
}

describe("tournament-routes wiring", () => {
  it("wires GET / directly to getTournaments", () => {
    assert.deepStrictEqual(find("get", "/").handlers, [
      mockControllers.getTournaments,
    ]);
  });

  it("wires POST / through auth, CSRF, and validation to createTournament", () => {
    assert.deepStrictEqual(find("post", "/").handlers, [
      mockAuthenticateSession,
      mockDoubleCsrfProtection,
      mockValidateCreateTournament,
      mockValidationHandler,
      mockControllers.createTournament,
    ]);
  });

  it("wires GET /mine through auth to getUserTournaments", () => {
    assert.deepStrictEqual(find("get", "/mine").handlers, [
      mockAuthenticateSession,
      mockControllers.getUserTournaments,
    ]);
  });

  it("wires GET /code/:code directly to getTournamentByCode", () => {
    assert.deepStrictEqual(find("get", "/code/:code").handlers, [
      mockControllers.getTournamentByCode,
    ]);
  });

  it("wires GET /:id directly to getTournamentById", () => {
    assert.deepStrictEqual(find("get", "/:id").handlers, [
      mockControllers.getTournamentById,
    ]);
  });

  const authAndCsrfRoutes = [
    ["post", "/:id/participants", "addParticipant"],
    ["patch", "/:id/participants/:participantId", "updateParticipant"],
    ["delete", "/:id/participants/:participantId", "removeParticipant"],
    ["post", "/:id/join", "joinTournament"],
    ["post", "/:id/start", "startTournament"],
    ["post", "/:id/advance", "advanceRound"],
    ["patch", "/:id/description", "updateDescription"],
    ["delete", "/:id", "deleteTournament"],
  ];

  for (const [method, path, controllerName] of authAndCsrfRoutes) {
    it(`wires ${method.toUpperCase()} ${path} through auth and CSRF protection to ${controllerName}`, () => {
      assert.deepStrictEqual(find(method, path).handlers, [
        mockAuthenticateSession,
        mockDoubleCsrfProtection,
        mockControllers[controllerName],
      ]);
    });
  }
});
