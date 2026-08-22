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

// The three helpers below exist so a limiter keyed on a short-lived identity
// (a socket id, an IP) cannot grow its Map without bound. They are the only
// thing standing between a long-running process and a slow memory leak, so
// their contract is pinned here rather than inferred from the caller.
describe("createRateLimiter — bucket lifecycle", () => {
  it("reports how many keys are currently held", () => {
    const isAllowed = createRateLimiter({ windowMs: 1000, max: 5 });
    assert.strictEqual(isAllowed.size(), 0);

    isAllowed("a");
    isAllowed("b");
    assert.strictEqual(isAllowed.size(), 2);

    // Repeat hits on a known key reuse its bucket rather than adding one.
    isAllowed("a");
    assert.strictEqual(isAllowed.size(), 2);
  });

  it("forget() drops a key and resets its allowance", () => {
    const isAllowed = createRateLimiter({ windowMs: 1000, max: 1 });
    assert.ok(isAllowed("socket-1"));
    assert.strictEqual(isAllowed("socket-1"), false);

    assert.strictEqual(isAllowed.forget("socket-1"), true);
    assert.strictEqual(isAllowed.size(), 0);

    // A reconnecting client starts from a clean allowance.
    assert.ok(isAllowed("socket-1"));
  });

  it("forget() reports false for a key it never held", () => {
    const isAllowed = createRateLimiter({ windowMs: 1000, max: 1 });
    assert.strictEqual(isAllowed.forget("never-seen"), false);
    assert.strictEqual(isAllowed.size(), 0);
  });

  it("pruneExpired() reclaims only the buckets whose window has passed", () => {
    let t = 0;
    const isAllowed = createRateLimiter({
      windowMs: 100,
      max: 5,
      now: () => t,
    });

    isAllowed("old");
    t = 60;
    isAllowed("new");
    assert.strictEqual(isAllowed.size(), 2);

    // "old" resets at 100, "new" at 160 — so at 100 exactly one is reclaimable.
    t = 100;
    isAllowed.pruneExpired();
    assert.strictEqual(isAllowed.size(), 1);

    t = 160;
    isAllowed.pruneExpired();
    assert.strictEqual(isAllowed.size(), 0);
  });

  it("pruneExpired() leaves a live bucket's count intact", () => {
    let t = 0;
    const isAllowed = createRateLimiter({
      windowMs: 100,
      max: 2,
      now: () => t,
    });

    isAllowed("key");
    isAllowed("key");

    t = 50;
    isAllowed.pruneExpired();

    // Pruning must not hand a throttled caller a fresh allowance.
    assert.strictEqual(isAllowed.size(), 1);
    assert.strictEqual(isAllowed("key"), false);
  });

  it("pruneExpired() is a no-op on an empty limiter", () => {
    const isAllowed = createRateLimiter({ windowMs: 100, max: 1 });
    assert.doesNotThrow(() => isAllowed.pruneExpired());
    assert.strictEqual(isAllowed.size(), 0);
  });
});
