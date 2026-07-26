import assert from "node:assert";
import { describe, it, mock } from "node:test";

const createdSchemas = [];

class MockSchema {
  constructor(definition) {
    this.definition = definition;
  }
  index() {}
}
MockSchema.Types = { ObjectId: "ObjectId", Mixed: "Mixed" };

mock.module("mongoose", {
  defaultExport: {
    Schema: MockSchema,
    model: mock.fn((name, schema) => {
      createdSchemas.push({ name, schema });
      return { modelName: name };
    }),
  },
});

const MatchModule = await import("../domain/models/match.js");

describe("match model", () => {
  it("exports the Match model", () => {
    assert.ok(MatchModule.default !== undefined);
    assert.strictEqual(MatchModule.default.modelName, "Match");
  });

  it("registers the match schema with mongoose.model", () => {
    const matchRegistration = createdSchemas.find((s) => s.name === "Match");
    assert.ok(matchRegistration);
    const fields = matchRegistration.schema.definition;
    assert.strictEqual(fields.round.required, true);
    assert.strictEqual(fields.status.default, "pending");
    assert.deepStrictEqual(fields.status.enum, [
      "pending",
      "in_progress",
      "completed",
      "disputed",
    ]);
    assert.deepStrictEqual(fields.reportedResults.default, []);
    assert.deepStrictEqual(fields.resultOverrides.default, []);
  });
});
