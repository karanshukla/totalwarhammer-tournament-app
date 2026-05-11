import assert from "node:assert";
import { describe, it } from "node:test";

import { createRateLimiter } from "../infrastructure/utils/rate-limiter.js";

describe("createRateLimiter", () => {
  it("allows requests up to the max", () => {
    const isAllowed = createRateLimiter({ windowMs: 1000, max: 3 });
    assert.ok(isAllowed("key"));
    assert.ok(isAllowed("key"));
    assert.ok(isAllowed("key"));
  });

  it("blocks the request that exceeds the max", () => {
    const isAllowed = createRateLimiter({ windowMs: 1000, max: 3 });
    isAllowed("key");
    isAllowed("key");
    isAllowed("key");
    assert.strictEqual(isAllowed("key"), false);
  });

  it("tracks different keys independently", () => {
    const isAllowed = createRateLimiter({ windowMs: 1000, max: 1 });
    assert.ok(isAllowed("a"));
    assert.ok(isAllowed("b"));
    assert.strictEqual(isAllowed("a"), false);
    assert.strictEqual(isAllowed("b"), false);
  });

  it("resets the count after the window expires", () => {
    let t = 0;
    const isAllowed = createRateLimiter({
      windowMs: 100,
      max: 1,
      now: () => t,
    });
    assert.ok(isAllowed("key"));
    assert.strictEqual(isAllowed("key"), false);
    t = 100; // advance to the exact window boundary — should reset
    assert.ok(isAllowed("key"));
    assert.strictEqual(isAllowed("key"), false);
  });

  it("does not reset before the window expires", () => {
    let t = 0;
    const isAllowed = createRateLimiter({
      windowMs: 100,
      max: 2,
      now: () => t,
    });
    isAllowed("key");
    isAllowed("key");
    t = 99; // one tick before reset
    assert.strictEqual(isAllowed("key"), false);
  });
});
