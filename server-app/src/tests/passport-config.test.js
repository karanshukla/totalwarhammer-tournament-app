import assert from "node:assert";
import { describe, it, mock } from "node:test";

let serializeUserCallback;
let deserializeUserCallback;

mock.module("passport", {
  defaultExport: {
    serializeUser: mock.fn((cb) => {
      serializeUserCallback = cb;
    }),
    deserializeUser: mock.fn((cb) => {
      deserializeUserCallback = cb;
    }),
  },
});

const mockFindById = mock.fn();
mock.module("../domain/models/user.js", {
  defaultExport: { findById: mockFindById },
});

const mockLoggerDebug = mock.fn();
mock.module("../infrastructure/utils/logger.js", {
  defaultExport: { debug: mockLoggerDebug, error: mock.fn() },
});

await import("../infrastructure/config/passport-config.js");

describe("passport-config", () => {
  describe("serializeUser", () => {
    it("serializes a user by its _id", () => {
      const done = mock.fn();
      serializeUserCallback({ _id: "abc123" }, done);
      assert.deepStrictEqual(done.mock.calls[0].arguments, [null, "abc123"]);
    });

    it("falls back to id when _id is absent", () => {
      const done = mock.fn();
      serializeUserCallback({ id: "guest-1" }, done);
      assert.deepStrictEqual(done.mock.calls[0].arguments, [null, "guest-1"]);
    });
  });

  describe("deserializeUser", () => {
    it("returns a plain user object when found", async () => {
      const select = mock.fn(async () => ({
        id: "u1",
        email: "a@example.com",
        username: "alice",
        passwordChangedAt: null,
      }));
      mockFindById.mock.mockImplementationOnce(() => ({ select }));

      const done = mock.fn();
      await deserializeUserCallback("u1", done);

      assert.strictEqual(mockFindById.mock.calls.length, 1);
      assert.deepStrictEqual(mockFindById.mock.calls[0].arguments, ["u1"]);
      assert.deepStrictEqual(select.mock.calls[0].arguments, ["-password"]);
      assert.deepStrictEqual(done.mock.calls[0].arguments, [
        null,
        {
          id: "u1",
          email: "a@example.com",
          username: "alice",
          role: "user",
          isGuest: false,
          passwordChangedAt: null,
        },
      ]);
    });

    it("includes passwordChangedAt when the user has one set (issue #101)", async () => {
      const changedAt = new Date("2026-01-01T00:00:00Z");
      const select = mock.fn(async () => ({
        id: "u1",
        email: "a@example.com",
        username: "alice",
        passwordChangedAt: changedAt,
      }));
      mockFindById.mock.mockImplementationOnce(() => ({ select }));

      const done = mock.fn();
      await deserializeUserCallback("u1", done);

      assert.strictEqual(
        done.mock.calls[0].arguments[1].passwordChangedAt,
        changedAt,
      );
    });

    it("calls done(null, false) and logs when the user is not found", async () => {
      const select = mock.fn(async () => null);
      mockFindById.mock.mockImplementationOnce(() => ({ select }));

      const done = mock.fn();
      await deserializeUserCallback("missing-id", done);

      assert.deepStrictEqual(done.mock.calls[0].arguments, [null, false]);
      assert.strictEqual(mockLoggerDebug.mock.calls.length, 1);
    });

    it("calls done(err) when the lookup throws", async () => {
      const failure = new Error("db unavailable");
      mockFindById.mock.mockImplementationOnce(() => ({
        select: mock.fn(async () => {
          throw failure;
        }),
      }));

      const done = mock.fn();
      await deserializeUserCallback("u1", done);

      assert.deepStrictEqual(done.mock.calls[0].arguments, [failure]);
    });
  });
});
