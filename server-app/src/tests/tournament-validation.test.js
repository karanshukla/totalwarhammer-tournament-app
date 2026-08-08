import assert from "node:assert";
import { describe, it } from "node:test";

import { validationResult } from "express-validator";

import {
  validateCreateTournament,
  validateTournamentIdParam,
  validateParticipantParams,
  validateTournamentCodeParam,
  validateAddParticipant,
  validateUpdateParticipant,
  validateJoinTournament,
  validateUpdateDescription,
  validateListTournamentsQuery,
} from "../interfaces/http/middleware/validation/tournament-validation.js";

async function runValidation(body) {
  const req = { body, query: {}, params: {}, headers: {} };
  for (const validator of validateCreateTournament) {
    await validator.run(req);
  }
  return validationResult(req);
}

describe("validateCreateTournament", () => {
  describe("name", () => {
    it("should pass with a valid name", async () => {
      const result = await runValidation({
        name: "My Tournament",
        playerCount: 8,
        tournamentType: "Single Elimination",
      });
      assert.strictEqual(result.isEmpty(), true);
    });

    it("should fail when name is missing", async () => {
      const result = await runValidation({
        playerCount: 8,
        tournamentType: "Single Elimination",
      });
      const errors = result.array();
      assert.ok(errors.some((e) => e.path === "name"));
    });

    it("should fail when name is too short", async () => {
      const result = await runValidation({
        name: "ab",
        playerCount: 8,
        tournamentType: "Single Elimination",
      });
      assert.ok(result.array().some((e) => e.path === "name"));
    });

    it("should fail when name exceeds 100 characters", async () => {
      const result = await runValidation({
        name: "a".repeat(101),
        playerCount: 8,
        tournamentType: "Single Elimination",
      });
      assert.ok(result.array().some((e) => e.path === "name"));
    });
  });

  describe("description", () => {
    it("should pass when description is absent", async () => {
      const result = await runValidation({
        name: "Valid Name",
        playerCount: 8,
        tournamentType: "Single Elimination",
      });
      assert.strictEqual(result.isEmpty(), true);
    });

    it("should fail when description exceeds 2000 characters", async () => {
      const result = await runValidation({
        name: "Valid Name",
        description: "x".repeat(2001),
        playerCount: 8,
        tournamentType: "Single Elimination",
      });
      assert.ok(result.array().some((e) => e.path === "description"));
    });

    it("should pass when description is exactly 2000 characters", async () => {
      const result = await runValidation({
        name: "Valid Name",
        description: "x".repeat(2000),
        playerCount: 8,
        tournamentType: "Single Elimination",
      });
      assert.strictEqual(result.isEmpty(), true);
    });
  });

  describe("playerCount", () => {
    it("should fail when playerCount is below minimum (2)", async () => {
      const result = await runValidation({
        name: "Valid Name",
        playerCount: 1,
        tournamentType: "Single Elimination",
      });
      assert.ok(result.array().some((e) => e.path === "playerCount"));
    });

    it("should fail when playerCount exceeds maximum (128)", async () => {
      const result = await runValidation({
        name: "Valid Name",
        playerCount: 129,
        tournamentType: "Single Elimination",
      });
      assert.ok(result.array().some((e) => e.path === "playerCount"));
    });

    it("should pass with playerCount at minimum boundary (2)", async () => {
      const result = await runValidation({
        name: "Valid Name",
        playerCount: 2,
        tournamentType: "Single Elimination",
      });
      assert.strictEqual(result.isEmpty(), true);
    });

    it("should pass with playerCount at maximum boundary (128)", async () => {
      const result = await runValidation({
        name: "Valid Name",
        playerCount: 128,
        tournamentType: "Single Elimination",
      });
      assert.strictEqual(result.isEmpty(), true);
    });

    it("should fail when playerCount is not an integer", async () => {
      const result = await runValidation({
        name: "Valid Name",
        playerCount: "eight",
        tournamentType: "Single Elimination",
      });
      assert.ok(result.array().some((e) => e.path === "playerCount"));
    });
  });

  describe("tournamentType", () => {
    const validTypes = [
      "Single Elimination",
      "Double Elimination",
      "Round Robin",
      "Swiss System",
    ];

    for (const type of validTypes) {
      it(`should pass with valid type: "${type}"`, async () => {
        const result = await runValidation({
          name: "Valid Name",
          playerCount: 8,
          tournamentType: type,
        });
        assert.strictEqual(result.isEmpty(), true);
      });
    }

    it("should fail with an invalid tournament type", async () => {
      const result = await runValidation({
        name: "Valid Name",
        playerCount: 8,
        tournamentType: "Battle Royale",
      });
      assert.ok(result.array().some((e) => e.path === "tournamentType"));
    });

    it("should fail when tournamentType is missing", async () => {
      const result = await runValidation({
        name: "Valid Name",
        playerCount: 8,
      });
      assert.ok(result.array().some((e) => e.path === "tournamentType"));
    });
  });

  describe("bannedFactions", () => {
    it("should pass with valid factions", async () => {
      const result = await runValidation({
        name: "Valid Name",
        playerCount: 8,
        tournamentType: "Single Elimination",
        bannedFactions: ["Skaven", "Nurgle"],
      });
      assert.strictEqual(result.isEmpty(), true);
    });

    it("should pass with an empty bannedFactions array", async () => {
      const result = await runValidation({
        name: "Valid Name",
        playerCount: 8,
        tournamentType: "Single Elimination",
        bannedFactions: [],
      });
      assert.strictEqual(result.isEmpty(), true);
    });

    it("should fail with an invalid faction name", async () => {
      const result = await runValidation({
        name: "Valid Name",
        playerCount: 8,
        tournamentType: "Single Elimination",
        bannedFactions: ["InvalidFaction"],
      });
      assert.ok(result.array().some((e) => e.path === "bannedFactions"));
    });

    it("should fail when bannedFactions is not an array", async () => {
      const result = await runValidation({
        name: "Valid Name",
        playerCount: 8,
        tournamentType: "Single Elimination",
        bannedFactions: "Skaven",
      });
      assert.ok(result.array().some((e) => e.path === "bannedFactions"));
    });

    it("should pass with 40k factions when 40k is enabled", async () => {
      const result = await runValidation({
        name: "Valid Name",
        playerCount: 8,
        tournamentType: "Single Elimination",
        enable40kFactions: true,
        bannedFactions: ["Necrons", "Orks"],
      });
      assert.strictEqual(result.isEmpty(), true);
    });

    it("should fail when banning wh3 factions in a 40k tournament", async () => {
      const result = await runValidation({
        name: "Valid Name",
        playerCount: 8,
        tournamentType: "Single Elimination",
        enable40kFactions: true,
        bannedFactions: ["Skaven"],
      });
      assert.ok(result.array().some((e) => e.path === "bannedFactions"));
    });

    it("should fail when banning 40k factions in a wh3 tournament", async () => {
      const result = await runValidation({
        name: "Valid Name",
        playerCount: 8,
        tournamentType: "Single Elimination",
        bannedFactions: ["Necrons"],
      });
      assert.ok(result.array().some((e) => e.path === "bannedFactions"));
    });
  });

  describe("full valid payload", () => {
    it("should pass with all valid fields provided", async () => {
      const result = await runValidation({
        name: "Grand Tournament",
        description: "The ultimate competition",
        playerCount: 16,
        tournamentType: "Double Elimination",
        bannedFactions: ["Chaos Dwarfs", "Kislev"],
      });
      assert.strictEqual(result.isEmpty(), true);
    });
  });

  describe("enable40kFactions", () => {
    it("should pass when enable40kFactions is true", async () => {
      const result = await runValidation({
        name: "40K Tournament",
        playerCount: 8,
        tournamentType: "Single Elimination",
        enable40kFactions: true,
      });
      assert.strictEqual(result.isEmpty(), true);
    });

    it("should pass when enable40kFactions is false", async () => {
      const result = await runValidation({
        name: "WH3 Tournament",
        playerCount: 8,
        tournamentType: "Single Elimination",
        enable40kFactions: false,
      });
      assert.strictEqual(result.isEmpty(), true);
    });

    it("should pass when enable40kFactions is absent", async () => {
      const result = await runValidation({
        name: "Valid Tournament",
        playerCount: 8,
        tournamentType: "Single Elimination",
      });
      assert.strictEqual(result.isEmpty(), true);
    });

    it("should fail when enable40kFactions is a non-boolean string", async () => {
      const result = await runValidation({
        name: "Valid Tournament",
        playerCount: 8,
        tournamentType: "Single Elimination",
        enable40kFactions: "yes",
      });
      assert.ok(result.array().some((e) => e.path === "enable40kFactions"));
    });
  });

  describe("bannedFactions with 40k factions", () => {
    it("should pass with valid 40k faction names in bannedFactions", async () => {
      const result = await runValidation({
        name: "40K Tournament",
        playerCount: 8,
        tournamentType: "Single Elimination",
        enable40kFactions: true,
        bannedFactions: ["Adeptus Astartes", "Drukhari"],
      });
      assert.strictEqual(result.isEmpty(), true);
    });

    it("should pass with modded 40k faction names in bannedFactions", async () => {
      const result = await runValidation({
        name: "40K Modded Tournament",
        playerCount: 8,
        tournamentType: "Single Elimination",
        enable40kFactions: true,
        bannedFactions: ["Death Guard", "Thousand Sons", "Blood Angels"],
      });
      assert.strictEqual(result.isEmpty(), true);
    });

    it("should fail with a faction name that is in neither WH3 nor 40k lists", async () => {
      const result = await runValidation({
        name: "Bad Tournament",
        playerCount: 8,
        tournamentType: "Single Elimination",
        bannedFactions: ["Space Communists"],
      });
      assert.ok(result.array().some((e) => e.path === "bannedFactions"));
    });
  });
});

// ── participant, param, and query validators ────────────────────────────────

const OBJECT_ID = "aaaaaaaaaaaaaaaaaaaaaaaa";
const OTHER_OBJECT_ID = "bbbbbbbbbbbbbbbbbbbbbbbb";

async function runChain(chain, { body = {}, params = {}, query = {} } = {}) {
  const req = { body, params, query, headers: {} };
  for (const validator of chain) {
    await validator.run(req);
  }
  return { result: validationResult(req), req };
}

const failedFields = (result) => result.array().map((e) => e.path);

describe("validateTournamentIdParam", () => {
  it("passes for a valid ObjectId", async () => {
    const { result } = await runChain(validateTournamentIdParam, {
      params: { id: OBJECT_ID },
    });
    assert.strictEqual(result.isEmpty(), true);
  });

  it("fails for a malformed ID", async () => {
    const { result } = await runChain(validateTournamentIdParam, {
      params: { id: "../../etc/passwd" },
    });
    assert.ok(failedFields(result).includes("id"));
  });
});

describe("validateParticipantParams", () => {
  it("passes when both IDs are valid", async () => {
    const { result } = await runChain(validateParticipantParams, {
      params: { id: OBJECT_ID, participantId: OTHER_OBJECT_ID },
    });
    assert.strictEqual(result.isEmpty(), true);
  });

  it("fails when the participant ID is malformed", async () => {
    const { result } = await runChain(validateParticipantParams, {
      params: { id: OBJECT_ID, participantId: "p1" },
    });
    assert.ok(failedFields(result).includes("participantId"));
  });
});

describe("validateTournamentCodeParam", () => {
  it("passes for an alphanumeric code", async () => {
    const { result } = await runChain(validateTournamentCodeParam, {
      params: { code: "AB12CD" },
    });
    assert.strictEqual(result.isEmpty(), true);
  });

  it("fails for a code with punctuation", async () => {
    const { result } = await runChain(validateTournamentCodeParam, {
      params: { code: "AB-12" },
    });
    assert.ok(failedFields(result).includes("code"));
  });

  it("fails for an over-long code", async () => {
    const { result } = await runChain(validateTournamentCodeParam, {
      params: { code: "A".repeat(13) },
    });
    assert.ok(failedFields(result).includes("code"));
  });
});

describe("validateAddParticipant", () => {
  it("passes with a name and a known faction", async () => {
    const { result } = await runChain(validateAddParticipant, {
      params: { id: OBJECT_ID },
      body: { name: "Alice", faction: "Skaven" },
    });
    assert.strictEqual(result.isEmpty(), true);
  });

  it("trims the name in place", async () => {
    const { req } = await runChain(validateAddParticipant, {
      params: { id: OBJECT_ID },
      body: { name: "  Alice  " },
    });
    assert.strictEqual(req.body.name, "Alice");
  });

  it("fails when the name is missing", async () => {
    const { result } = await runChain(validateAddParticipant, {
      params: { id: OBJECT_ID },
      body: {},
    });
    assert.ok(failedFields(result).includes("name"));
  });

  it("fails when the name is whitespace only", async () => {
    const { result } = await runChain(validateAddParticipant, {
      params: { id: OBJECT_ID },
      body: { name: "   " },
    });
    assert.ok(failedFields(result).includes("name"));
  });

  it("fails when the name exceeds 100 characters", async () => {
    const { result } = await runChain(validateAddParticipant, {
      params: { id: OBJECT_ID },
      body: { name: "a".repeat(101) },
    });
    assert.ok(failedFields(result).includes("name"));
  });

  it("fails when the name is not a string", async () => {
    const { result } = await runChain(validateAddParticipant, {
      params: { id: OBJECT_ID },
      body: { name: { first: "Alice" } },
    });
    assert.ok(failedFields(result).includes("name"));
  });

  it("fails for a faction outside the registry", async () => {
    const { result } = await runChain(validateAddParticipant, {
      params: { id: OBJECT_ID },
      body: { name: "Alice", faction: "Atlanteans" },
    });
    assert.ok(failedFields(result).includes("faction"));
  });
});

describe("validateUpdateParticipant", () => {
  it("passes when only the faction changes", async () => {
    const { result } = await runChain(validateUpdateParticipant, {
      params: { id: OBJECT_ID, participantId: OTHER_OBJECT_ID },
      body: { faction: "Kislev" },
    });
    assert.strictEqual(result.isEmpty(), true);
  });

  it("fails when a supplied name is blank", async () => {
    const { result } = await runChain(validateUpdateParticipant, {
      params: { id: OBJECT_ID, participantId: OTHER_OBJECT_ID },
      body: { name: "   " },
    });
    assert.ok(failedFields(result).includes("name"));
  });
});

describe("validateJoinTournament", () => {
  it("passes without a faction", async () => {
    const { result } = await runChain(validateJoinTournament, {
      params: { id: OBJECT_ID },
      body: {},
    });
    assert.strictEqual(result.isEmpty(), true);
  });

  it("fails for an unknown faction", async () => {
    const { result } = await runChain(validateJoinTournament, {
      params: { id: OBJECT_ID },
      body: { faction: "Not A Faction" },
    });
    assert.ok(failedFields(result).includes("faction"));
  });
});

describe("validateUpdateDescription", () => {
  it("passes for an empty description", async () => {
    const { result } = await runChain(validateUpdateDescription, {
      params: { id: OBJECT_ID },
      body: { description: "" },
    });
    assert.strictEqual(result.isEmpty(), true);
  });

  it("fails when the description is absent", async () => {
    const { result } = await runChain(validateUpdateDescription, {
      params: { id: OBJECT_ID },
      body: {},
    });
    assert.ok(failedFields(result).includes("description"));
  });

  it("fails when the description is not a string", async () => {
    const { result } = await runChain(validateUpdateDescription, {
      params: { id: OBJECT_ID },
      body: { description: 123 },
    });
    assert.ok(failedFields(result).includes("description"));
  });

  it("fails when the description exceeds 2000 characters", async () => {
    const { result } = await runChain(validateUpdateDescription, {
      params: { id: OBJECT_ID },
      body: { description: "x".repeat(2001) },
    });
    assert.ok(failedFields(result).includes("description"));
  });
});

describe("validateListTournamentsQuery", () => {
  it("passes without a status filter", async () => {
    const { result } = await runChain(validateListTournamentsQuery, {});
    assert.strictEqual(result.isEmpty(), true);
  });

  it("passes for a comma-separated list of known statuses", async () => {
    const { result } = await runChain(validateListTournamentsQuery, {
      query: { status: "active,pending" },
    });
    assert.strictEqual(result.isEmpty(), true);
  });

  it("fails for an unknown status", async () => {
    const { result } = await runChain(validateListTournamentsQuery, {
      query: { status: "active,deleted" },
    });
    assert.ok(failedFields(result).includes("status"));
  });

  it("fails when status is repeated into an array", async () => {
    const { result } = await runChain(validateListTournamentsQuery, {
      query: { status: ["active", "pending"] },
    });
    assert.ok(failedFields(result).includes("status"));
  });
});
