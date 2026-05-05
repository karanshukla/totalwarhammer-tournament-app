import assert from "node:assert";
import { describe, it } from "node:test";

import { validationResult } from "express-validator";

import { validateCreateTournament } from "../interfaces/http/middleware/validation/tournament-validation.js";

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
});
