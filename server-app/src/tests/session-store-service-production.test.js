// Tests the production branch of session-store-service.js (forwarded-scheme guard).
// Must run in its own file so NODE_ENV can be set before module import.

import assert from "node:assert";
import { describe, it } from "node:test";

process.env.NODE_ENV = "production";

const { warnOnInsecureForwardedScheme } =
  await import("../infrastructure/services/session-store-service.js");
const { default: logger } = await import("../infrastructure/utils/logger.js");

const captureErrors = async (run) => {
  const original = logger.error;
  const messages = [];
  logger.error = (message) => messages.push(message);
  try {
    await run();
  } finally {
    logger.error = original;
  }
  return messages;
};

const callWith = (middleware, forwardedProto) => {
  const headers =
    forwardedProto === undefined ? {} : { "x-forwarded-proto": forwardedProto };
  let nextCalls = 0;
  middleware({ headers }, {}, () => nextCalls++);
  return nextCalls;
};

describe("warnOnInsecureForwardedScheme — production branch", () => {
  it("stays silent when the proxy forwards https", async () => {
    const middleware = warnOnInsecureForwardedScheme();
    const messages = await captureErrors(() => {
      assert.strictEqual(callWith(middleware, "https"), 1);
    });
    assert.deepStrictEqual(messages, []);
  });

  it("reports a plain-http forwarded scheme", async () => {
    const middleware = warnOnInsecureForwardedScheme();
    const messages = await captureErrors(() => {
      callWith(middleware, "http");
    });
    assert.strictEqual(messages.length, 1);
    assert.match(messages[0], /X-Forwarded-Proto: "http"/);
  });

  it("reports an absent header, which is how a misconfigured proxy presents", async () => {
    const middleware = warnOnInsecureForwardedScheme();
    const messages = await captureErrors(() => {
      callWith(middleware, undefined);
    });
    assert.strictEqual(messages.length, 1);
    assert.match(messages[0], /\(absent\)/);
  });

  it("reads only the client-facing hop of a multi-proxy header", async () => {
    const middleware = warnOnInsecureForwardedScheme();
    const messages = await captureErrors(() => {
      callWith(middleware, "https, http");
    });
    assert.deepStrictEqual(messages, []);
  });

  it("reports once per process rather than on every request", async () => {
    const middleware = warnOnInsecureForwardedScheme();
    const messages = await captureErrors(() => {
      callWith(middleware, "http");
      callWith(middleware, "http");
      callWith(middleware, "http");
    });
    assert.strictEqual(messages.length, 1);
  });

  it("always calls next(), so a misconfigured proxy never blocks a request", async () => {
    const middleware = warnOnInsecureForwardedScheme();
    await captureErrors(() => {
      assert.strictEqual(callWith(middleware, "http"), 1);
      assert.strictEqual(callWith(middleware, "https"), 1);
    });
  });
});
