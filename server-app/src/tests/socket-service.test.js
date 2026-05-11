import assert from "node:assert";
import { describe, it, beforeEach, mock } from "node:test";

// ── Mock socket.io ────────────────────────────────────────────────────────────
const mockEmitFn = mock.fn();
const mockToFn = mock.fn(() => ({ emit: mockEmitFn }));
const ioHandlers = {};
const mockIoInstance = {
  to: mockToFn,
  on: mock.fn((event, handler) => {
    ioHandlers[event] = handler;
  }),
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
        typeof ioHandlers["connection"] === "function",
        "connection handler should be registered",
      );
    });
  });

  describe("room management (connection handler)", () => {
    it("joins the tournament room when tournament:join is received", () => {
      const socket = makeSocket();
      ioHandlers["connection"](socket);
      socket._fire("tournament:join", "tid123");
      assert.strictEqual(
        socket.join.mock.calls[0].arguments[0],
        "tournament:tid123",
      );
    });

    it("leaves the tournament room when tournament:leave is received", () => {
      const socket = makeSocket();
      ioHandlers["connection"](socket);
      socket._fire("tournament:leave", "tid456");
      assert.strictEqual(
        socket.leave.mock.calls[0].arguments[0],
        "tournament:tid456",
      );
    });

    it("does not throw on disconnect", () => {
      const socket = makeSocket();
      ioHandlers["connection"](socket);
      assert.doesNotThrow(() => socket._fire("disconnect"));
    });
  });

  describe("emitTournamentUpdated", () => {
    it("broadcasts to the correct tournament room", () => {
      emitTournamentUpdated("t1", {});
      assert.strictEqual(
        mockToFn.mock.calls[0].arguments[0],
        "tournament:t1",
      );
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
      assert.strictEqual(
        mockToFn.mock.calls[0].arguments[0],
        "tournament:t2",
      );
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
      assert.strictEqual(
        mockToFn.mock.calls[0].arguments[0],
        "tournament:t3",
      );
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
      assert.strictEqual(
        mockToFn.mock.calls[0].arguments[0],
        "tournament:t4",
      );
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
});
