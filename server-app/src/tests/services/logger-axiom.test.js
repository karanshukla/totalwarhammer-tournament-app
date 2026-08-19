// Tests the Axiom transport branch (lines 60-66) in logger.js.
// This file runs in its own module scope so it can import a fresh logger
// with AXIOM_TOKEN and AXIOM_DATASET env vars set.

import assert from "node:assert";
import { describe, it, mock } from "node:test";

// Set env vars BEFORE any imports so the module reads them at load time
process.env.AXIOM_TOKEN = "test-axiom-token";
process.env.AXIOM_DATASET = "test-axiom-dataset";
process.env.NODE_ENV = "production";

const mockAxiomTransportClass = class MockAxiomTransport {
  constructor(opts) {
    this.opts = opts;
  }
};

// Mock @axiomhq/winston so we don't actually connect to Axiom
mock.module("@axiomhq/winston", {
  namedExports: {
    WinstonTransport: mockAxiomTransportClass,
  },
});

const mockCreateLogger = mock.fn((opts) => ({
  level: opts.level,
  transports: opts.transports,
  error: mock.fn(),
  warn: mock.fn(),
  info: mock.fn(),
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
      Console: class MockConsole {},
      File: class MockFile {},
    },
  },
});

// Import the logger AFTER mocks are set up
const { default: logger } =
  await import("../../infrastructure/utils/logger.js");

describe("logger – Axiom transport branch", () => {
  it("adds an AxiomTransport when AXIOM_TOKEN and AXIOM_DATASET are set", () => {
    assert.ok(
      mockCreateLogger.mock.calls.length >= 1,
      "createLogger should have been called",
    );
    const callArgs = mockCreateLogger.mock.calls[0].arguments[0];
    const transports = callArgs.transports;

    // At least one transport should be an instance of our MockAxiomTransport
    const axiomTransport = transports.find(
      (t) => t instanceof mockAxiomTransportClass,
    );
    assert.ok(
      axiomTransport,
      "AxiomTransport should be in the transports list",
    );
  });

  it("initialises Axiom transport with correct token and dataset", () => {
    const callArgs = mockCreateLogger.mock.calls[0].arguments[0];
    const transports = callArgs.transports;
    const axiomTransport = transports.find(
      (t) => t instanceof mockAxiomTransportClass,
    );

    assert.strictEqual(axiomTransport.opts.token, "test-axiom-token");
    assert.strictEqual(axiomTransport.opts.dataset, "test-axiom-dataset");
  });

  it("logger level is 'info' in production environment", () => {
    const callArgs = mockCreateLogger.mock.calls[0].arguments[0];
    assert.strictEqual(callArgs.level, "info");
  });

  it("logger exposes standard log methods", () => {
    assert.strictEqual(typeof logger.error, "function");
    assert.strictEqual(typeof logger.warn, "function");
    assert.strictEqual(typeof logger.info, "function");
  });
});
