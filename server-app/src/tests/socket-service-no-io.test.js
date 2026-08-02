import assert from "node:assert";
import { describe, it, mock } from "node:test";

// This dedicated file exercises the "!io" early-return branch in each emit
// helper. socket-service.test.js calls initSocketIO() once at module load so
// io is always set there; here we import the module fresh and call the emit
// helpers before ever calling initSocketIO, leaving the module-level `io`
// variable null.

mock.module("@socket.io/redis-adapter", {
  namedExports: { createAdapter: mock.fn() },
});
mock.module("@socket.io/mongo-adapter", {
  namedExports: { createAdapter: mock.fn() },
});
mock.module("../infrastructure/services/redis-service.js", {
  namedExports: {
    getRedisClient: mock.fn(() => null),
    createNewRedisClient: mock.fn(() => null),
  },
});
mock.module("mongoose", {
  defaultExport: {
    connection: {
      asPromise: mock.fn(() => Promise.resolve()),
      db: {
        createCollection: mock.fn(async () => {}),
        collection: mock.fn(() => ({})),
      },
    },
  },
});
mock.module("socket.io", {
  namedExports: { Server: mock.fn() },
});
mock.module("../infrastructure/utils/logger.js", {
  defaultExport: {
    debug: mock.fn(),
    info: mock.fn(),
    error: mock.fn(),
    warn: mock.fn(),
  },
});

const {
  emitTournamentUpdated,
  emitMatchesUpdated,
  emitMatchesAppended,
  emitMatchUpdated,
} = await import("../infrastructure/socket/socket-service.js");

describe("socket-service — emit helpers before initSocketIO (io is null)", () => {
  it("emitTournamentUpdated returns without throwing when io is not initialized", () => {
    assert.doesNotThrow(() => emitTournamentUpdated("t1", {}));
  });

  it("emitMatchesUpdated returns without throwing when io is not initialized", () => {
    assert.doesNotThrow(() => emitMatchesUpdated("t2", []));
  });

  it("emitMatchesAppended returns without throwing when io is not initialized", () => {
    assert.doesNotThrow(() => emitMatchesAppended("t3", []));
  });

  it("emitMatchUpdated returns without throwing when io is not initialized", () => {
    assert.doesNotThrow(() => emitMatchUpdated("t4", {}));
  });
});
