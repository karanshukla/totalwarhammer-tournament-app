/**
 * The ZAP API scan drives .github/openapi.yml. When the spec drifts from the
 * validators, every request it synthesises is rejected with a 400 before it
 * reaches a controller and the scan silently covers nothing — so the spec is
 * checked here rather than trusted.
 */
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { validationResult } from "express-validator";
import { parse } from "yaml";

import {
  validateLogin,
  validateToken,
} from "../interfaces/http/middleware/validation/authentication-validation.js";
import {
  validateCreateMatch,
  validateMatchIdParam,
  validateOverrideResult,
  validateRecordResult,
  validateReportResult,
  validateResolveDispute,
  validateTournamentIdParam as validateMatchTournamentIdParam,
  validateUpdateMatchStatus,
} from "../interfaces/http/middleware/validation/match-validation.js";
import {
  validatePasswordResetEmail,
  validateResetPassword,
  validateResetToken,
} from "../interfaces/http/middleware/validation/password-reset-validation.js";
import {
  validateGlobalStatsQuery,
  validateUserStatsQuery,
} from "../interfaces/http/middleware/validation/stats-validation.js";
import {
  validateAddParticipant,
  validateCreateTournament,
  validateJoinTournament,
  validateListTournamentsQuery,
  validateParticipantParams,
  validateTournamentCodeParam,
  validateTournamentIdParam,
  validateUpdateDescription,
  validateUpdateParticipant,
} from "../interfaces/http/middleware/validation/tournament-validation.js";
import {
  validateGuestUsername,
  validateUpdatePassword,
  validateUpdateUsername,
  validateUserExists,
  validateUserRegistration,
} from "../interfaces/http/middleware/validation/user-validation.js";

const repoRoot = new URL("../../../", import.meta.url);
const routesDir = new URL("../interfaces/http/routes/", import.meta.url);

const spec = parse(
  readFileSync(new URL(".github/openapi.yml", repoRoot), "utf8"),
);

// null = the route runs no validator chain, so there is nothing to check.
const VALIDATORS = {
  getCsrfToken: null,
  authLogin: validateLogin,
  authLogoutPost: null,
  authLogoutDelete: null,
  authToken: validateToken,
  userRegister: validateUserRegistration,
  userExists: validateUserExists,
  userLogin: validateLogin,
  userLogout: null,
  updateUsername: validateUpdateUsername,
  updatePassword: validateUpdatePassword,
  deleteAccount: null,
  getUserStats: validateUserStatsQuery,
  createGuest: null,
  updateGuestUsername: validateGuestUsername,
  requestPasswordReset: validatePasswordResetEmail,
  verifyResetToken: validateResetToken,
  resetPassword: validateResetPassword,
  getTournaments: validateListTournamentsQuery,
  createTournament: validateCreateTournament,
  getUserTournaments: null,
  getTournamentByCode: validateTournamentCodeParam,
  getTournamentById: validateTournamentIdParam,
  deleteTournament: validateTournamentIdParam,
  addParticipant: validateAddParticipant,
  updateParticipant: validateUpdateParticipant,
  removeParticipant: validateParticipantParams,
  joinTournament: validateJoinTournament,
  startTournament: validateTournamentIdParam,
  advanceRound: validateTournamentIdParam,
  updateDescription: validateUpdateDescription,
  getMatchesByTournament: validateMatchTournamentIdParam,
  getMatchById: validateMatchIdParam,
  createMatch: validateCreateMatch,
  reportResult: validateReportResult,
  recordResult: validateRecordResult,
  resolveDispute: validateResolveDispute,
  overrideResult: validateOverrideResult,
  updateMatchStatus: validateUpdateMatchStatus,
  getStats: validateGlobalStatsQuery,
};

const METHODS = ["get", "post", "put", "patch", "delete"];

const deref = (node) => {
  if (!node?.$ref) return node;
  return node.$ref
    .replace(/^#\//, "")
    .split("/")
    .reduce((acc, key) => acc[key], spec);
};

function exampleOf(schema) {
  const resolved = deref(schema);
  if (!resolved) return undefined;
  if (resolved.example !== undefined) return resolved.example;
  if (resolved.enum) return resolved.enum[0];
  if (resolved.type === "object" && resolved.properties) {
    const built = {};
    for (const [key, value] of Object.entries(resolved.properties)) {
      const example = exampleOf(value);
      if (example !== undefined) built[key] = example;
    }
    return built;
  }
  if (resolved.type === "array") {
    const item = exampleOf(resolved.items);
    return item === undefined ? [] : [item];
  }
  return undefined;
}

function missingExamples(schema, path = "") {
  const resolved = deref(schema);
  if (!resolved) return [];
  if (resolved.example !== undefined || resolved.enum) return [];
  if (resolved.type === "object" && resolved.properties) {
    return Object.entries(resolved.properties).flatMap(([key, value]) =>
      missingExamples(value, `${path}.${key}`),
    );
  }
  if (resolved.type === "array") return missingExamples(resolved.items, path);
  return [path];
}

function operations() {
  const found = [];
  for (const [path, item] of Object.entries(spec.paths)) {
    for (const method of METHODS) {
      if (item[method]) found.push({ path, method, operation: item[method] });
    }
  }
  return found;
}

function routeTable() {
  const index = readFileSync(new URL("index.js", routesDir), "utf8");
  const prefixes = new Map();
  for (const [, prefix, variable] of index.matchAll(
    /router\.use\("([^"]+)",\s*(\w+)\)/g,
  )) {
    prefixes.set(variable, prefix);
  }
  const files = new Map();
  for (const [, variable, file] of index.matchAll(
    /import (\w+) from "\.\/([\w-]+\.js)"/g,
  )) {
    files.set(variable, file);
  }

  const routes = [];
  for (const [variable, prefix] of prefixes) {
    const source = readFileSync(
      new URL(files.get(variable), routesDir),
      "utf8",
    );
    for (const [, method, path] of source.matchAll(
      /router\.(get|post|put|patch|delete)\(\s*"([^"]*)"/g,
    )) {
      routes.push({ method, path: `${prefix}${path}`.replace(/\/$/, "") });
    }
  }
  return routes;
}

// /tournament/:id and /tournament/{id} are the same endpoint.
const key = ({ path, method }) =>
  `${method.toUpperCase()} ${path.replace(/[:{]\w+}?/g, ":param")}`;

describe("openapi spec ↔ routes", () => {
  it("documents every route the server registers", () => {
    const documented = new Set(operations().map(key));
    const undocumented = routeTable()
      .filter((route) => !documented.has(key(route)))
      .map(key);
    assert.deepStrictEqual(undocumented, []);
  });

  it("documents no route the server does not register", () => {
    const registered = new Set(routeTable().map(key));
    const phantom = operations()
      .map(key)
      .filter((op) => !registered.has(op));
    assert.deepStrictEqual(phantom, []);
  });

  it("maps every documented operation to a validator or an explicit null", () => {
    const unmapped = operations()
      .map(({ operation }) => operation.operationId)
      .filter((id) => !(id in VALIDATORS));
    assert.deepStrictEqual(unmapped, []);
  });
});

describe("openapi request examples pass the validators", () => {
  for (const { path, method, operation } of operations()) {
    const chain = VALIDATORS[operation.operationId];
    if (!chain) continue;

    it(`${method.toUpperCase()} ${path}`, async () => {
      const req = { body: {}, params: {}, query: {}, headers: {} };

      for (const parameter of operation.parameters ?? []) {
        const value = exampleOf(parameter.schema);
        if (parameter.in === "path") req.params[parameter.name] = value;
        if (parameter.in === "query") req.query[parameter.name] = value;
      }

      const bodySchema =
        operation.requestBody?.content?.["application/json"]?.schema;
      if (bodySchema) {
        assert.deepStrictEqual(
          missingExamples(bodySchema),
          [],
          "every request property needs an example — ZAP sends the literal " +
            "string 'string' otherwise",
        );
        req.body = exampleOf(bodySchema);
      }

      for (const validator of chain) await validator.run(req);

      const errors = validationResult(req).array();
      assert.deepStrictEqual(
        errors.map((e) => `${e.path}: ${e.msg}`),
        [],
      );
    });
  }
});
