import assert from "node:assert";
import { describe, it, mock } from "node:test";

const createdSchemas = [];

class MockSchema {
  constructor(definition) {
    this.definition = definition;
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

const TournamentModule = await import("../domain/models/tournament.js");

describe("tournament model", () => {
  it("exports the Tournament model", () => {
    assert.ok(TournamentModule.default !== undefined);
    assert.strictEqual(TournamentModule.default.modelName, "Tournament");
  });

  it("registers the tournament schema with mongoose.model", () => {
    const registration = createdSchemas.find((s) => s.name === "Tournament");
    assert.ok(registration);
    const fields = registration.schema.definition;
    assert.strictEqual(fields.playerCount.required, true);
    assert.strictEqual(fields.playerCount.min, 2);
    assert.strictEqual(fields.playerCount.max, 128);
    assert.deepStrictEqual(fields.tournamentType.enum, [
      "Single Elimination",
      "Double Elimination",
      "Round Robin",
      "Swiss System",
    ]);
    assert.strictEqual(fields.status.default, "pending");
    assert.deepStrictEqual(fields.bannedFactions.default, []);
    assert.deepStrictEqual(fields.participants.default, []);
  });
});
