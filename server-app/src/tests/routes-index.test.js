import assert from "node:assert";
import { describe, it, mock } from "node:test";

function createRouterMock() {
  const registrations = [];
  const router = {};
  for (const method of ["get", "post", "delete", "patch", "use"]) {
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

const mockCorsMiddleware = Symbol("cors-middleware");
const mockCors = mock.fn(() => mockCorsMiddleware);
mock.module("cors", { defaultExport: mockCors });

mock.module("../infrastructure/config/env.js", {
  namedExports: { clientUrl: "http://localhost:5173" },
});

const authRoutesMarker = Symbol("auth-routes");
const guestRoutesMarker = Symbol("guest-routes");
const matchRoutesMarker = Symbol("match-routes");
const passwordResetRoutesMarker = Symbol("password-reset-routes");
const statsRoutesMarker = Symbol("stats-routes");
const tournamentRoutesMarker = Symbol("tournament-routes");
const userRoutesMarker = Symbol("user-routes");

mock.module("../interfaces/http/routes/authentication-routes.js", {
  defaultExport: authRoutesMarker,
});
mock.module("../interfaces/http/routes/guest-routes.js", {
  defaultExport: guestRoutesMarker,
});
mock.module("../interfaces/http/routes/match-routes.js", {
  defaultExport: matchRoutesMarker,
});
mock.module("../interfaces/http/routes/password-reset-routes.js", {
  defaultExport: passwordResetRoutesMarker,
});
mock.module("../interfaces/http/routes/stats-routes.js", {
  defaultExport: statsRoutesMarker,
});
mock.module("../interfaces/http/routes/tournament-routes.js", {
  defaultExport: tournamentRoutesMarker,
});
mock.module("../interfaces/http/routes/user-routes.js", {
  defaultExport: userRoutesMarker,
});

await import("../interfaces/http/routes/index.js");

function find(method, path) {
  return registrations.find((r) => r.method === method && r.path === path);
}

describe("routes/index wiring", () => {
  it("applies CORS configured for the client URL", () => {
    assert.deepStrictEqual(mockCors.mock.calls[0].arguments[0], {
      origin: "http://localhost:5173",
      methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
      preflightContinue: false,
      optionsSuccessStatus: 204,
      credentials: true,
    });
    assert.deepStrictEqual(find("use", mockCorsMiddleware).handlers, []);
  });

  it("redirects GET / to the client URL", () => {
    const handler = find("get", "/").handlers[0];
    const redirectCalls = [];
    const res = { redirect: (url) => redirectCalls.push(url) };

    handler({}, res);

    assert.deepStrictEqual(redirectCalls, ["http://localhost:5173"]);
  });

  const mountedRoutes = [
    ["/user", userRoutesMarker],
    ["/auth", authRoutesMarker],
    ["/guest", guestRoutesMarker],
    ["/password-reset", passwordResetRoutesMarker],
    ["/tournament", tournamentRoutesMarker],
    ["/match", matchRoutesMarker],
    ["/stats", statsRoutesMarker],
  ];

  for (const [prefix, marker] of mountedRoutes) {
    it(`mounts ${prefix} with its router`, () => {
      assert.deepStrictEqual(find("use", prefix).handlers, [marker]);
    });
  }
});
