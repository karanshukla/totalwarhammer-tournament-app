import assert from "node:assert";
import { describe, it, beforeEach, mock } from "node:test";

const mockMongoDBSessionStoreCtor = mock.fn(function (options) {
  this.options = options;
  this.on = mock.fn((event, handler) => {
    this.handlers ??= {};
    this.handlers[event] = handler;
  });
});
const mockMongoDBStoreFactory = mock.fn(() => mockMongoDBSessionStoreCtor);
mock.module("connect-mongodb-session", {
  defaultExport: mockMongoDBStoreFactory,
});

const mockRedisStoreCtor = mock.fn(function (options) {
  this.options = options;
});
mock.module("connect-redis", {
  namedExports: { RedisStore: mockRedisStoreCtor },
});

const mockSession = mock.fn((options) => ({ sessionOptions: options }));
mock.module("express-session", { defaultExport: mockSession });

mock.module("../../infrastructure/config/env.js", {
  namedExports: { mongoUri: "mongodb://localhost:27017/twt-app" },
});

const mockLoggerError = mock.fn();
mock.module("../../infrastructure/utils/logger.js", {
  defaultExport: { info: mock.fn(), error: mockLoggerError },
});

const mockGetRedisClient = mock.fn(() => ({ isReady: true }));
mock.module("../../infrastructure/services/redis-service.js", {
  namedExports: { getRedisClient: mockGetRedisClient },
});

const { configureSessionStore, configureSessionMiddleware } =
  await import("../../infrastructure/services/session-store-service.js");

describe("session-store-service", () => {
  beforeEach(() => {
    delete process.env.USE_MONGO_SESSION;
    delete process.env.REDIS_URL;
  });

  describe("configureSessionStore", () => {
    it("uses the MongoDB store when USE_MONGO_SESSION is true", async () => {
      process.env.USE_MONGO_SESSION = "true";
      process.env.REDIS_URL = "redis://localhost:6379";

      const store = await configureSessionStore();

      assert.ok(store instanceof mockMongoDBSessionStoreCtor);
      assert.strictEqual(store.options.collection, "sessions");
      assert.strictEqual(mockRedisStoreCtor.mock.calls.length, 0);
    });

    it("uses the MongoDB store when REDIS_URL is not set", async () => {
      const store = await configureSessionStore();

      assert.ok(store instanceof mockMongoDBSessionStoreCtor);
    });

    it("logs an error when the MongoDB store emits an error event", async () => {
      const store = await configureSessionStore();
      const callsBefore = mockLoggerError.mock.calls.length;

      store.handlers.error(new Error("connection lost"));

      assert.strictEqual(mockLoggerError.mock.calls.length, callsBefore + 1);
      assert.match(
        mockLoggerError.mock.calls.at(-1).arguments[0],
        /connection lost/,
      );
    });

    it("uses the Redis store when REDIS_URL is set and USE_MONGO_SESSION is not true", async () => {
      process.env.REDIS_URL = "redis://localhost:6379";

      const store = await configureSessionStore();

      assert.ok(store instanceof mockRedisStoreCtor);
      assert.strictEqual(store.options.prefix, "twt-app-session:");
      assert.strictEqual(mockGetRedisClient.mock.calls.length, 1);
    });
  });

  describe("configureSessionMiddleware", () => {
    it("builds session middleware with a strict, secure cookie in production", async () => {
      const middleware = await configureSessionMiddleware("shh", true);

      const [options] = mockSession.mock.calls.at(-1).arguments;
      assert.strictEqual(options.secret, "shh");
      assert.strictEqual(options.cookie.sameSite, "strict");
      assert.strictEqual(options.name, "sid");
      assert.ok(middleware.sessionOptions);
    });

    it("builds session middleware with a lax cookie outside production", async () => {
      await configureSessionMiddleware("shh", false);

      const [options] = mockSession.mock.calls.at(-1).arguments;
      assert.strictEqual(options.cookie.sameSite, "lax");
    });
  });
});
