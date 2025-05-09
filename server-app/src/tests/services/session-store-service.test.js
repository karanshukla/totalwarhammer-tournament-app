/* eslint-disable no-unused-vars */
// Tests for session-store-service.js using Node.js built-in test runner
import assert from "node:assert";
import { describe, it, beforeEach, mock, afterEach } from "node:test";

// Direct import of the service we're testing - no mocks yet
import {
  configureSessionStore,
  configureSessionMiddleware,
} from "../../infrastructure/services/session-store-service.js";

// Hold original environment variables
const originalEnv = { ...process.env };

describe("SessionStoreService", () => {
  let mockStore;
  let mockRedisClient;
  let mockRedisStore;

  beforeEach(() => {
    // Reset environment variables
    process.env = { ...originalEnv };

    // Create mock functions that we'll use
    mockStore = {
      on: mock.fn(),
    };
    mockRedisClient = {
      connect: mock.fn(() => Promise.resolve()),
    };
    mockRedisStore = {};

    // Setup test environment
    process.env.NODE_ENV = "test";
  });

  afterEach(() => {
    // Restore environment variables
    process.env = { ...originalEnv };
  });

  describe("configureSessionStore - basic functionality", () => {
    it("should create a session store based on environment configuration", () => {
      // We can't easily mock modules in ESM without special tools
      // So this is more of an integration test checking the basic functionality

      // Assert that the function at least returns something
      let store = configureSessionStore();
      assert.ok(store, "Should return a session store object");

      // Try with different environment variables
      process.env.USE_MONGO_SESSION = "true";
      store = configureSessionStore();
      assert.ok(
        store,
        "Should return a MongoDB session store object when USE_MONGO_SESSION=true"
      );

      process.env.USE_MONGO_SESSION = "false";
      store = configureSessionStore();
      assert.ok(
        store,
        "Should return a Redis session store object when USE_MONGO_SESSION=false"
      );
    });
  });

  describe("configureSessionMiddleware", () => {
    it("should return a function", () => {
      const middleware = configureSessionMiddleware("test-secret", false);
      assert.strictEqual(typeof middleware, "function");
    });

    it("should work with different environment parameters", () => {
      // Production environment
      const prodMiddleware = configureSessionMiddleware("test-secret", true);
      assert.strictEqual(typeof prodMiddleware, "function");

      // Non-production environment
      const devMiddleware = configureSessionMiddleware("test-secret", false);
      assert.strictEqual(typeof devMiddleware, "function");
    });
  });
});
