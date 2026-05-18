import assert from "node:assert";
import { describe, it, mock } from "node:test";

// ── Redis package mock ────────────────────────────────────────────────────────
const mockConnect = mock.fn(async () => {});
const mockOn = mock.fn();
const mockClient = { connect: mockConnect, on: mockOn };
const mockCreateClient = mock.fn(() => mockClient);

mock.module("redis", {
  namedExports: { createClient: mockCreateClient },
});

mock.module("../../infrastructure/utils/logger.js", {
  defaultExport: { error: mock.fn(), info: mock.fn() },
});

const { getRedisClient, createNewRedisClient } = await import(
  "../../infrastructure/services/redis-service.js"
);

// Note: these tests run in order because getRedisClient() is a module-level
// singleton — once a client is created it persists for the module's lifetime.

describe("redis-service", () => {
  describe("getRedisClient", () => {
    it("returns null when REDIS_URL is not set", () => {
      delete process.env.REDIS_URL;

      const result = getRedisClient();

      assert.strictEqual(result, null);
      assert.strictEqual(mockCreateClient.mock.calls.length, 0);
    });

    it("creates client, starts connect, and returns it when REDIS_URL is set", () => {
      process.env.REDIS_URL = "redis://localhost:6379";

      const result = getRedisClient();

      assert.strictEqual(result, mockClient);
      assert.strictEqual(mockCreateClient.mock.calls.length, 1);
      assert.deepStrictEqual(mockCreateClient.mock.calls[0].arguments[0], {
        url: "redis://localhost:6379",
      });
      // connect() is called (fire-and-forget)
      assert.strictEqual(mockConnect.mock.calls.length, 1);
    });

    it("returns the same singleton instance on subsequent calls", () => {
      const first = getRedisClient();
      const second = getRedisClient();

      assert.strictEqual(first, second);
      // createClient still called only once across all calls
      assert.strictEqual(mockCreateClient.mock.calls.length, 1);
    });
  });

  describe("createNewRedisClient", () => {
    it("returns null when REDIS_URL is not set", () => {
      delete process.env.REDIS_URL;

      const result = createNewRedisClient();

      assert.strictEqual(result, null);
    });

    it("creates and returns a client when REDIS_URL is set", () => {
      process.env.REDIS_URL = "redis://localhost:6379";
      const callsBefore = mockCreateClient.mock.calls.length;

      const result = createNewRedisClient();

      assert.strictEqual(result, mockClient);
      assert.strictEqual(mockCreateClient.mock.calls.length, callsBefore + 1);
    });

    it("creates a new client on every call — not a singleton", () => {
      process.env.REDIS_URL = "redis://localhost:6379";
      const callsBefore = mockCreateClient.mock.calls.length;

      createNewRedisClient();
      createNewRedisClient();

      assert.strictEqual(mockCreateClient.mock.calls.length, callsBefore + 2);
    });

    it("does not affect the getRedisClient singleton", () => {
      process.env.REDIS_URL = "redis://localhost:6379";

      const singleton = getRedisClient();
      createNewRedisClient();
      const singletonAgain = getRedisClient();

      assert.strictEqual(singleton, singletonAgain);
    });
  });
});
