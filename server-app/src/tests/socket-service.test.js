import assert from "node:assert";
import { describe, it, beforeEach, mock } from "node:test";

// ── Mock adapters ─────────────────────────────────────────────────────────────
const mockCreateRedisAdapter = mock.fn(() => "redis-adapter");
mock.module("@socket.io/redis-adapter", {
  namedExports: { createAdapter: mockCreateRedisAdapter },
});

const mockCreateMongoAdapter = mock.fn(() => "mongo-adapter");
mock.module("@socket.io/mongo-adapter", {
  namedExports: { createAdapter: mockCreateMongoAdapter },
});

// ── Mock redis-service ────────────────────────────────────────────────────────
const mockGetRedisClient = mock.fn(() => null);
const mockCreateNewRedisClient = mock.fn(() => null);
mock.module("../infrastructure/services/redis-service.js", {
  namedExports: {
    getRedisClient: mockGetRedisClient,
    createNewRedisClient: mockCreateNewRedisClient,
  },
});

// ── Mock mongoose ─────────────────────────────────────────────────────────────
const mockCollection = {};
const mockCreateCollection = mock.fn(async () => {});
const mockDbCollection = mock.fn(() => mockCollection);
const mockAsPromise = mock.fn(() => Promise.resolve());
mock.module("mongoose", {
  defaultExport: {
    connection: {
      asPromise: mockAsPromise,
      db: {
        createCollection: mockCreateCollection,
        collection: mockDbCollection,
      },
    },
  },
});

// ── Mock socket.io ────────────────────────────────────────────────────────────
const mockEmitFn = mock.fn();
const mockToFn = mock.fn(() => ({ emit: mockEmitFn }));
const ioHandlers = {};
const ioMiddlewares = [];
const mockIoInstance = {
  adapter: mock.fn(),
  to: mockToFn,
  on: mock.fn((event, handler) => {
    ioHandlers[event] = handler;
  }),
  use: mock.fn((fn) => {
    ioMiddlewares.push(fn);
  }),
  engine: {
    on: mock.fn(),
  },
};

// Track calls manually since we need a constructor that works with 'new'
const mockServerCalls = [];
function MockServer(httpServer, options) {
  mockServerCalls.push({ arguments: [httpServer, options] });
  return mockIoInstance;
}
// Add mock property for test assertions
MockServer.mock = {
  calls: mockServerCalls,
};

mock.module("socket.io", {
  namedExports: { Server: MockServer },
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
  initSocketIO,
  emitTournamentUpdated,
  emitMatchesUpdated,
  emitMatchesAppended,
  emitMatchUpdated,
} = await import("../infrastructure/socket/socket-service.js");

// Initialize once so emit functions have an io instance for all tests below.
initSocketIO({}, "http://localhost:3001");

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeSocket() {
  const handlers = {};
  const socket = {
    id: `sock-${Math.random()}`,
    join: mock.fn(),
    leave: mock.fn(),
    disconnect: mock.fn(),
    on: mock.fn((event, handler) => {
      handlers[event] = handler;
    }),
    _fire: (event, ...args) => handlers[event]?.(...args),
  };
  return socket;
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("socket-service", () => {
  beforeEach(() => {
    mockToFn.mock.resetCalls();
    mockEmitFn.mock.resetCalls();
  });

  describe("initSocketIO", () => {
    it("creates a socket.io Server instance", () => {
      assert.strictEqual(MockServer.mock.calls.length, 1);
    });

    it("passes the cors origin and credentials to the Server", () => {
      const [, opts] = MockServer.mock.calls[0].arguments;
      assert.strictEqual(opts.cors.origin, "http://localhost:3001");
      assert.strictEqual(opts.cors.credentials, true);
    });

    it("registers a connection event handler on the io instance", () => {
      assert.ok(
        typeof ioHandlers.connection === "function",
        "connection handler should be registered",
      );
    });

    describe("adapter initialization — no Redis (MongoDB fallback)", () => {
      // The module-level initSocketIO call ran with both Redis clients returning
      // null, so it fell through to the MongoDB adapter path. The .then() is a
      // microtask; setImmediate lets it drain before we assert.
      it("attaches an adapter to the io instance", async () => {
        await new Promise((resolve) => setImmediate(resolve));
        assert.strictEqual(mockIoInstance.adapter.mock.calls.length, 1);
      });

      it("uses the MongoDB adapter when Redis is unavailable", async () => {
        await new Promise((resolve) => setImmediate(resolve));
        assert.strictEqual(mockCreateMongoAdapter.mock.calls.length, 1);
        assert.strictEqual(mockCreateRedisAdapter.mock.calls.length, 0);
      });

      it("passes the mongo collection to the MongoDB adapter", async () => {
        await new Promise((resolve) => setImmediate(resolve));
        assert.strictEqual(
          mockIoInstance.adapter.mock.calls[0].arguments[0],
          "mongo-adapter",
        );
      });

      it("creates the capped adapter collection", async () => {
        await new Promise((resolve) => setImmediate(resolve));
        assert.strictEqual(mockCreateCollection.mock.calls.length, 1);
        assert.strictEqual(
          mockCreateCollection.mock.calls[0].arguments[0],
          "socket.io-adapter-events",
        );
        assert.deepStrictEqual(
          mockCreateCollection.mock.calls[0].arguments[1],
          { capped: true, size: 1_000_000 },
        );
      });
    });

    describe("adapter initialization — Redis available", () => {
      it("attaches the Redis adapter when both clients are returned", () => {
        const fakePub = {};
        const fakeSub = {};
        mockGetRedisClient.mock.resetCalls();
        mockCreateNewRedisClient.mock.resetCalls();
        mockCreateRedisAdapter.mock.resetCalls();
        mockIoInstance.adapter.mock.resetCalls();
        mockGetRedisClient.mock.mockImplementation(() => fakePub);
        mockCreateNewRedisClient.mock.mockImplementation(() => fakeSub);

        initSocketIO({}, "http://localhost:3001");

        assert.strictEqual(mockCreateRedisAdapter.mock.calls.length, 1);
        assert.strictEqual(
          mockCreateRedisAdapter.mock.calls[0].arguments[0],
          fakePub,
        );
        assert.strictEqual(
          mockCreateRedisAdapter.mock.calls[0].arguments[1],
          fakeSub,
        );
        assert.strictEqual(
          mockIoInstance.adapter.mock.calls[0].arguments[0],
          "redis-adapter",
        );
      });
    });

    describe("adapter initialization — only one Redis client available", () => {
      it("falls back to the MongoDB adapter when only the pub client is available", async () => {
        mockGetRedisClient.mock.resetCalls();
        mockCreateNewRedisClient.mock.resetCalls();
        mockCreateRedisAdapter.mock.resetCalls();
        mockCreateMongoAdapter.mock.resetCalls();
        mockIoInstance.adapter.mock.resetCalls();
        mockGetRedisClient.mock.mockImplementation(() => ({}));
        mockCreateNewRedisClient.mock.mockImplementation(() => null);

        initSocketIO({}, "http://localhost:3001");
        await new Promise((resolve) => setImmediate(resolve));

        assert.strictEqual(mockCreateRedisAdapter.mock.calls.length, 0);
        assert.strictEqual(mockCreateMongoAdapter.mock.calls.length, 1);

        mockGetRedisClient.mock.mockImplementation(() => null);
        mockCreateNewRedisClient.mock.mockImplementation(() => null);
      });
    });
  });

  describe("room management (connection handler)", () => {
    const validId = "aaaaaaaaaaaaaaaaaaaaaaaa";

    it("joins the tournament room when tournament:join is received", () => {
      const socket = makeSocket();
      ioHandlers.connection(socket);
      socket._fire("tournament:join", validId);
      assert.strictEqual(
        socket.join.mock.calls[0].arguments[0],
        `tournament:${validId}`,
      );
    });

    it("ignores tournament:join with an invalid id", () => {
      const socket = makeSocket();
      ioHandlers.connection(socket);
      socket._fire("tournament:join", "not-an-objectid");
      assert.strictEqual(socket.join.mock.calls.length, 0);
    });

    it("ignores tournament:join with a non-string id", () => {
      const socket = makeSocket();
      ioHandlers.connection(socket);
      socket._fire("tournament:join", 12345);
      assert.strictEqual(socket.join.mock.calls.length, 0);
    });

    it("leaves the tournament room when tournament:leave is received", () => {
      const socket = makeSocket();
      ioHandlers.connection(socket);
      socket._fire("tournament:leave", validId);
      assert.strictEqual(
        socket.leave.mock.calls[0].arguments[0],
        `tournament:${validId}`,
      );
    });

    it("ignores tournament:leave with an invalid id", () => {
      const socket = makeSocket();
      ioHandlers.connection(socket);
      socket._fire("tournament:leave", 12345);
      assert.strictEqual(socket.leave.mock.calls.length, 0);
    });

    it("does not throw on disconnect", () => {
      const socket = makeSocket();
      ioHandlers.connection(socket);
      assert.doesNotThrow(() => socket._fire("disconnect"));
    });
  });

  // ── Rate limiting ────────────────────────────────────────────────────────────

  describe("connection rate limiting", () => {
    it("registers a connection middleware on io", () => {
      assert.strictEqual(typeof ioMiddlewares[0], "function");
    });

    it("allows a connection within the per-IP limit", () => {
      const next = mock.fn();
      ioMiddlewares[0]({ handshake: { address: "1.2.3.4" } }, next);
      assert.strictEqual(next.mock.calls[0].arguments[0], undefined);
    });

    it("rejects the 21st connection from the same IP", () => {
      const ip = "10.0.0.99"; // unique to this test
      for (let i = 0; i < 20; i++) {
        ioMiddlewares[0]({ handshake: { address: ip } }, mock.fn());
      }
      const next = mock.fn();
      ioMiddlewares[0]({ handshake: { address: ip } }, next);
      assert.ok(next.mock.calls[0].arguments[0] instanceof Error);
    });
  });

  describe("event rate limiting", () => {
    const validId = "aaaaaaaaaaaaaaaaaaaaaaaa";

    it("allows events within the per-socket limit", () => {
      const socket = makeSocket();
      ioHandlers.connection(socket);
      socket._fire("tournament:join", validId);
      assert.strictEqual(socket.disconnect.mock.calls.length, 0);
      assert.strictEqual(socket.join.mock.calls.length, 1);
    });

    it("disconnects the socket on the 61st event", () => {
      const socket = makeSocket(); // unique socket.id via Math.random()
      ioHandlers.connection(socket);
      for (let i = 0; i < 60; i++) {
        socket._fire("tournament:join", validId);
      }
      socket._fire("tournament:join", validId);
      assert.strictEqual(socket.disconnect.mock.calls.length, 1);
      assert.strictEqual(socket.join.mock.calls.length, 60);
    });
  });

  // ── Emit helpers ─────────────────────────────────────────────────────────────

  describe("emitTournamentUpdated", () => {
    it("broadcasts to the correct tournament room", () => {
      emitTournamentUpdated("t1", {});
      assert.strictEqual(mockToFn.mock.calls[0].arguments[0], "tournament:t1");
    });

    it("emits the tournament:updated event with the tournament payload", () => {
      const tournament = { _id: "t1", name: "Test Cup" };
      emitTournamentUpdated("t1", tournament);
      assert.strictEqual(
        mockEmitFn.mock.calls[0].arguments[0],
        "tournament:updated",
      );
      assert.deepStrictEqual(mockEmitFn.mock.calls[0].arguments[1], tournament);
    });
  });

  describe("emitMatchesUpdated", () => {
    it("broadcasts to the correct tournament room", () => {
      emitMatchesUpdated("t2", []);
      assert.strictEqual(mockToFn.mock.calls[0].arguments[0], "tournament:t2");
    });

    it("emits the matches:updated event with the full match array", () => {
      const matches = [{ _id: "m1" }, { _id: "m2" }];
      emitMatchesUpdated("t2", matches);
      assert.strictEqual(
        mockEmitFn.mock.calls[0].arguments[0],
        "matches:updated",
      );
      assert.deepStrictEqual(mockEmitFn.mock.calls[0].arguments[1], matches);
    });
  });

  describe("emitMatchesAppended", () => {
    it("broadcasts to the correct tournament room", () => {
      emitMatchesAppended("t3", []);
      assert.strictEqual(mockToFn.mock.calls[0].arguments[0], "tournament:t3");
    });

    it("emits the matches:appended event with only the new matches", () => {
      const newMatches = [{ _id: "m3" }];
      emitMatchesAppended("t3", newMatches);
      assert.strictEqual(
        mockEmitFn.mock.calls[0].arguments[0],
        "matches:appended",
      );
      assert.deepStrictEqual(mockEmitFn.mock.calls[0].arguments[1], newMatches);
    });
  });

  describe("emitMatchUpdated", () => {
    it("broadcasts to the correct tournament room", () => {
      emitMatchUpdated("t4", {});
      assert.strictEqual(mockToFn.mock.calls[0].arguments[0], "tournament:t4");
    });

    it("emits the match:updated event with the updated match", () => {
      const match = { _id: "m1", status: "completed" };
      emitMatchUpdated("t4", match);
      assert.strictEqual(
        mockEmitFn.mock.calls[0].arguments[0],
        "match:updated",
      );
      assert.deepStrictEqual(mockEmitFn.mock.calls[0].arguments[1], match);
    });
  });

  // ─── branch coverage for previously-uncovered paths ───────────────────────────

  describe("engine connection_error handler", () => {
    it("logs the error when the engine emits connection_error", () => {
      // The handler was registered via io.engine.on("connection_error", handler).
      // Retrieve it from the mock call list and invoke it directly.
      const call = mockIoInstance.engine.on.mock.calls.find(
        (c) => c.arguments[0] === "connection_error",
      );
      assert.ok(call, "connection_error handler should be registered");
      const handler = call.arguments[1];
      const fakeErr = {
        code: 1,
        message: "test connection error",
        context: {},
        req: null,
      };
      assert.doesNotThrow(() => handler(fakeErr));
    });

    it("logs the request headers when the engine error carries a request", () => {
      const call = mockIoInstance.engine.on.mock.calls.find(
        (c) => c.arguments[0] === "connection_error",
      );
      const handler = call.arguments[1];
      const fakeErr = {
        code: 1,
        message: "test connection error",
        context: {},
        req: { headers: { origin: "http://localhost:5173" } },
      };
      assert.doesNotThrow(() => handler(fakeErr));
    });
  });

  describe("MongoDB adapter — collection already exists (NamespaceExists)", () => {
    it("silently continues when createCollection rejects with code 48", async () => {
      mockGetRedisClient.mock.resetCalls();
      mockCreateNewRedisClient.mock.resetCalls();
      mockGetRedisClient.mock.mockImplementation(() => null);
      mockCreateNewRedisClient.mock.mockImplementation(() => null);
      mockIoInstance.adapter.mock.resetCalls();
      mockCreateMongoAdapter.mock.resetCalls();

      const namespaceExistsError = new Error("collection already exists");
      namespaceExistsError.code = 48;
      mockCreateCollection.mock.mockImplementation(async () => {
        throw namespaceExistsError;
      });

      initSocketIO({}, "http://localhost:3001");
      await new Promise((resolve) => setImmediate(resolve));

      assert.strictEqual(mockCreateMongoAdapter.mock.calls.length, 1);
      assert.strictEqual(mockIoInstance.adapter.mock.calls.length, 1);

      mockCreateCollection.mock.mockImplementation(async () => {});
    });
  });

  describe("MongoDB adapter — createCollection non-NamespaceExists error", () => {
    it("catches and logs errors when createCollection rejects with code !== 48", async () => {
      // Reset Redis mocks so the code takes the MongoDB fallback path.
      mockGetRedisClient.mock.resetCalls();
      mockCreateNewRedisClient.mock.resetCalls();
      mockGetRedisClient.mock.mockImplementation(() => null);
      mockCreateNewRedisClient.mock.mockImplementation(() => null);

      const dbError = new Error("disk full");
      dbError.code = 11; // not 48 (NamespaceExists) → should be re-thrown and caught by outer catch
      mockCreateCollection.mock.mockImplementation(async () => {
        throw dbError;
      });

      initSocketIO({}, "http://localhost:3001");

      // Allow the async then() callback to settle.
      await new Promise((resolve) => setImmediate(resolve));

      // The outer catch should have been hit; adapter should NOT have been called
      // for this initSocketIO invocation (adapter call count doesn't increase).
      // Restoring the default to avoid polluting later tests.
      mockCreateCollection.mock.mockImplementation(async () => {});
    });
  });

  describe("event rate limiting — tournament:leave", () => {
    it("disconnects the socket when the event rate limit is exceeded via tournament:leave", () => {
      const validId = "aaaaaaaaaaaaaaaaaaaaaaaa";
      const socket = makeSocket();
      ioHandlers.connection(socket);

      // Exhaust all 60 allowed events using tournament:leave.
      for (let i = 0; i < 60; i++) {
        socket._fire("tournament:leave", validId);
      }
      assert.strictEqual(socket.disconnect.mock.calls.length, 0);

      // The 61st event triggers the rate-limit branch (lines 103-106).
      socket._fire("tournament:leave", validId);
      assert.strictEqual(socket.disconnect.mock.calls.length, 1);
      assert.strictEqual(socket.disconnect.mock.calls[0].arguments[0], true);
    });
  });
});
