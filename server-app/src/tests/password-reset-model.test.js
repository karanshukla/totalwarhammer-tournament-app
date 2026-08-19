import assert from "node:assert";
import { describe, it, mock } from "node:test";

const createdSchemas = [];

class MockSchema {
  constructor(definition) {
    this.definition = definition;
    this.statics = {};
  }
  index() {}
}
MockSchema.Types = { ObjectId: "ObjectId" };

mock.module("mongoose", {
  defaultExport: {
    Schema: MockSchema,
    model: mock.fn((name, schema) => {
      createdSchemas.push({ name, schema });
      return { modelName: name };
    }),
  },
});

const PasswordResetModule = await import("../domain/models/password-reset.js");
const { schema } = createdSchemas.find((s) => s.name === "PasswordReset");

describe("password-reset model", () => {
  it("exports the PasswordReset model", () => {
    assert.ok(PasswordResetModule.default !== undefined);
    assert.strictEqual(PasswordResetModule.default.modelName, "PasswordReset");
  });

  it("registers expiring, unique resetKey field", () => {
    const fields = schema.definition;
    assert.strictEqual(fields.resetKey.required, true);
    assert.strictEqual(fields.resetKey.unique, true);
    assert.strictEqual(fields.createdAt.expires, 3600);
    assert.strictEqual(fields.isUsed.default, false);
  });

  describe("createResetToken", () => {
    it("generates a resetKey and creates a document for the given user", async () => {
      const mockCreate = mock.fn(async (doc) => ({ _id: "reset-1", ...doc }));
      const result = await schema.statics.createResetToken.call(
        { create: mockCreate },
        "user-123",
      );

      assert.strictEqual(mockCreate.mock.calls.length, 1);
      const [createArg] = mockCreate.mock.calls[0].arguments;
      assert.strictEqual(createArg.userId, "user-123");
      assert.match(createArg.resetKey, /^[0-9a-f]{64}$/);
      assert.strictEqual(result.userId, "user-123");
    });
  });

  describe("validateResetToken", () => {
    it("looks up an unused token by resetKey", async () => {
      const foundToken = { resetKey: "abc", isUsed: false };
      const mockFindOne = mock.fn(async () => foundToken);
      const result = await schema.statics.validateResetToken.call(
        { findOne: mockFindOne },
        "abc",
      );

      assert.strictEqual(mockFindOne.mock.calls.length, 1);
      const query = mockFindOne.mock.calls[0].arguments[0];
      assert.strictEqual(query.resetKey, "abc");
      assert.strictEqual(query.isUsed, false);
      // Expiry is enforced in the query, not left to the TTL sweeper alone.
      assert.ok(query.createdAt.$gt instanceof Date);
      assert.ok(query.createdAt.$gt.getTime() <= Date.now() - 3599_000);
      assert.strictEqual(result, foundToken);
    });

    it("returns null when no matching unused token exists", async () => {
      const mockFindOne = mock.fn(async () => null);
      const result = await schema.statics.validateResetToken.call(
        { findOne: mockFindOne },
        "missing",
      );

      assert.strictEqual(result, null);
    });
  });
});
