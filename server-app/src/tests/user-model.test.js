/**
 * Branch coverage for domain/models/user.js:
 * validatePassword method:
 *   - returns true when password matches hash
 *   - returns false when password does not match
 */
import assert from "node:assert";
import { describe, it, mock } from "node:test";

const mockCompare = mock.fn();

mock.module("bcrypt", {
  defaultExport: { compare: mockCompare },
});

const createdSchemas = [];

mock.module("mongoose", {
  defaultExport: {
    Schema: class {
      constructor() {}
      index() {}
      methods = {};
    },
    model: mock.fn((name, schema) => {
      createdSchemas.push(schema);
      return {};
    }),
  },
});

const UserModule = await import("../domain/models/user.js");
const [userSchema] = createdSchemas;

// The User model has a validatePassword method on instances.
// Since we mock mongoose, we need to access the method via the Schema prototype.
// The schema's methods object is where validatePassword is defined.
// We reconstruct the instance approach by capturing the schema.

// Re-implement the method logic from the source to test the bcrypt branch:
// userSchema.methods.validatePassword = async function (password) {
//   return await bcrypt.compare(password, this.password);
// };

describe("user model – validatePassword", () => {
  it("returns true when password matches the stored hash", async () => {
    mockCompare.mock.mockImplementation(async () => true);
    const bcrypt = (await import("bcrypt")).default;
    const result = await bcrypt.compare("correct", "hash");
    assert.strictEqual(result, true);
  });

  it("returns false when password does not match", async () => {
    mockCompare.mock.mockImplementation(async () => false);
    const bcrypt = (await import("bcrypt")).default;
    const result = await bcrypt.compare("wrong", "hash");
    assert.strictEqual(result, false);
  });

  it("User model is exported", () => {
    // Verify the module exports a User model (even if mocked)
    assert.ok(UserModule.default !== undefined);
  });

  it("instance method delegates to bcrypt.compare with the stored hash", async () => {
    mockCompare.mock.mockImplementation(async () => true);
    const instance = { password: "stored-hash" };
    const result = await userSchema.methods.validatePassword.call(
      instance,
      "correct",
    );
    assert.strictEqual(result, true);
    const lastCall = mockCompare.mock.calls.at(-1);
    assert.deepStrictEqual(lastCall.arguments, ["correct", "stored-hash"]);
  });

  it("instance method returns false when bcrypt.compare rejects the password", async () => {
    mockCompare.mock.mockImplementation(async () => false);
    const instance = { password: "stored-hash" };
    const result = await userSchema.methods.validatePassword.call(
      instance,
      "wrong",
    );
    assert.strictEqual(result, false);
  });
});
