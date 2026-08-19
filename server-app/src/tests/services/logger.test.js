import assert from "node:assert";
import { describe, it, mock } from "node:test";

// Set NODE_ENV to development before importing logger so the "debug" branch of
// the level() function is exercised during module initialisation.
const originalNodeEnv = process.env.NODE_ENV;
process.env.NODE_ENV = "development";

const mockCreateLogger = mock.fn((opts) => ({
  level: opts.level,
  error: mock.fn(),
  warn: mock.fn(),
  info: mock.fn(),
  http: mock.fn(),
  debug: mock.fn(),
}));

mock.module("winston", {
  defaultExport: {
    addColors: mock.fn(),
    createLogger: mockCreateLogger,
    format: {
      combine: mock.fn((...args) => args),
      timestamp: mock.fn(() => ({})),
      colorize: mock.fn(() => ({})),
      printf: mock.fn(() => ({})),
      errors: mock.fn(() => ({})),
      json: mock.fn(() => ({})),
    },
    transports: {
      Console: class {},
      File: class {},
    },
  },
});

const loggerModule = await import("../../infrastructure/utils/logger.js");
const logger = loggerModule.default;

// Restore NODE_ENV so other modules are not affected
process.env.NODE_ENV = originalNodeEnv;

describe("logger", () => {
  it("should call winston.createLogger once during module initialisation", () => {
    assert.strictEqual(mockCreateLogger.mock.calls.length, 1);
  });

  it("should pass level 'debug' when NODE_ENV is development", () => {
    const options = mockCreateLogger.mock.calls[0].arguments[0];
    assert.strictEqual(options.level, "debug");
  });

  it("should expose error, warn, info, http and debug methods", () => {
    assert.strictEqual(typeof logger.error, "function");
    assert.strictEqual(typeof logger.warn, "function");
    assert.strictEqual(typeof logger.info, "function");
    assert.strictEqual(typeof logger.http, "function");
    assert.strictEqual(typeof logger.debug, "function");
  });

  it("should pass custom log levels to createLogger", () => {
    const options = mockCreateLogger.mock.calls[0].arguments[0];
    assert.ok(options.levels, "levels object should be present");
    assert.strictEqual(typeof options.levels.error, "number");
    assert.strictEqual(typeof options.levels.debug, "number");
    assert.ok(
      options.levels.error < options.levels.debug,
      "error should have lower numeric level than debug",
    );
  });
});
