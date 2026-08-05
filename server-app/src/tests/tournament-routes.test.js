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

const validationNames = [
  "validateCreateTournament",
  "validateTournamentIdParam",
  "validateParticipantParams",
  "validateTournamentCodeParam",
  "validateAddParticipant",
  "validateUpdateParticipant",
  "validateJoinTournament",
  "validateUpdateDescription",
  "validateListTournamentsQuery",
];
const mockValidators = Object.fromEntries(
  validationNames.map((name) => [name, mock.fn()]),
);
mock.module(
  "../interfaces/http/middleware/validation/tournament-validation.js",
  { namedExports: mockValidators },
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
  it("wires GET / through query validation to getTournaments", () => {
    assert.deepStrictEqual(find("get", "/").handlers, [
      mockValidators.validateListTournamentsQuery,
      mockValidationHandler,
      mockControllers.getTournaments,
    ]);
  });

  it("wires POST / through auth, CSRF, and validation to createTournament", () => {
    assert.deepStrictEqual(find("post", "/").handlers, [
      mockAuthenticateSession,
      mockDoubleCsrfProtection,
      mockValidators.validateCreateTournament,
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

  it("wires GET /code/:code through code validation to getTournamentByCode", () => {
    assert.deepStrictEqual(find("get", "/code/:code").handlers, [
      mockValidators.validateTournamentCodeParam,
      mockValidationHandler,
      mockControllers.getTournamentByCode,
    ]);
  });

  it("wires GET /:id through ID validation to getTournamentById", () => {
    assert.deepStrictEqual(find("get", "/:id").handlers, [
      mockValidators.validateTournamentIdParam,
      mockValidationHandler,
      mockControllers.getTournamentById,
    ]);
  });

  const authAndCsrfRoutes = [
    ["post", "/:id/participants", "addParticipant", "validateAddParticipant"],
    [
      "patch",
      "/:id/participants/:participantId",
      "updateParticipant",
      "validateUpdateParticipant",
    ],
    [
      "delete",
      "/:id/participants/:participantId",
      "removeParticipant",
      "validateParticipantParams",
    ],
    ["post", "/:id/join", "joinTournament", "validateJoinTournament"],
    ["post", "/:id/start", "startTournament", "validateTournamentIdParam"],
    ["post", "/:id/advance", "advanceRound", "validateTournamentIdParam"],
    [
      "patch",
      "/:id/description",
      "updateDescription",
      "validateUpdateDescription",
    ],
    ["delete", "/:id", "deleteTournament", "validateTournamentIdParam"],
  ];

  for (const [
    method,
    path,
    controllerName,
    validatorName,
  ] of authAndCsrfRoutes) {
    it(`wires ${method.toUpperCase()} ${path} through auth, CSRF, and validation to ${controllerName}`, () => {
      assert.deepStrictEqual(find(method, path).handlers, [
        mockAuthenticateSession,
        mockDoubleCsrfProtection,
        mockValidators[validatorName],
        mockValidationHandler,
        mockControllers[controllerName],
      ]);
    });
  }
});
