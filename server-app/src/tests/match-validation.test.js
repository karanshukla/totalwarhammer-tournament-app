import assert from "node:assert";
import { describe, it } from "node:test";

import { validationResult } from "express-validator";

import {
  validateMatchIdParam,
  validateTournamentIdParam,
  validateCreateMatch,
  validateReportResult,
  validateResolveDispute,
  validateOverrideResult,
  validateUpdateMatchStatus,
} from "../interfaces/http/middleware/validation/match-validation.js";

const OBJECT_ID = "aaaaaaaaaaaaaaaaaaaaaaaa";
const OTHER_OBJECT_ID = "bbbbbbbbbbbbbbbbbbbbbbbb";

async function run(chain, { body = {}, params = {} } = {}) {
  const req = { body, params, query: {}, headers: {} };
  for (const validator of chain) {
    await validator.run(req);
  }
  return { result: validationResult(req), req };
}

const failedFields = (result) => result.array().map((e) => e.path);

function validPlayerSlot(name) {
  return { name, faction: "Empire", participantId: OBJECT_ID };
}

describe("match ID param validation", () => {
  it("passes for a valid ObjectId", async () => {
    const { result } = await run(validateMatchIdParam, {
      params: { id: OBJECT_ID },
    });
    assert.strictEqual(result.isEmpty(), true);
  });

  it("fails for a malformed ID", async () => {
    const { result } = await run(validateMatchIdParam, {
      params: { id: "not-an-id" },
    });
    assert.ok(failedFields(result).includes("id"));
    assert.match(result.array()[0].msg, /invalid match id/i);
  });

  it("fails for a malformed tournament ID", async () => {
    const { result } = await run(validateTournamentIdParam, {
      params: { tournamentId: "42" },
    });
    assert.ok(failedFields(result).includes("tournamentId"));
  });
});

describe("validateCreateMatch", () => {
  const validBody = {
    tournamentId: OBJECT_ID,
    round: 1,
    matchNumber: 1,
    player1: validPlayerSlot("Alice"),
    player2: validPlayerSlot("Bob"),
  };

  it("passes with a fully valid payload", async () => {
    const { result } = await run(validateCreateMatch, { body: validBody });
    assert.strictEqual(result.isEmpty(), true);
  });

  it("coerces numeric strings for round and matchNumber", async () => {
    const { result, req } = await run(validateCreateMatch, {
      body: { ...validBody, round: "3", matchNumber: "7" },
    });
    assert.strictEqual(result.isEmpty(), true);
    assert.strictEqual(req.body.round, 3);
    assert.strictEqual(req.body.matchNumber, 7);
  });

  it("fails when round is below 1", async () => {
    const { result } = await run(validateCreateMatch, {
      body: { ...validBody, round: 0 },
    });
    assert.ok(failedFields(result).includes("round"));
  });

  it("fails when a player slot is missing", async () => {
    const { result } = await run(validateCreateMatch, {
      body: { ...validBody, player2: undefined },
    });
    assert.ok(failedFields(result).includes("player2"));
  });

  it("fails when a player name is blank", async () => {
    const { result } = await run(validateCreateMatch, {
      body: { ...validBody, player1: { name: "   " } },
    });
    assert.ok(failedFields(result).includes("player1.name"));
  });

  it("fails when a player name exceeds 100 characters", async () => {
    const { result } = await run(validateCreateMatch, {
      body: { ...validBody, player1: { name: "a".repeat(101) } },
    });
    assert.ok(failedFields(result).includes("player1.name"));
  });

  it("fails for a faction outside the registry", async () => {
    const { result } = await run(validateCreateMatch, {
      body: { ...validBody, player1: { name: "Alice", faction: "Atlanteans" } },
    });
    assert.ok(failedFields(result).includes("player1.faction"));
  });

  it("accepts an empty faction as 'no faction'", async () => {
    const { result } = await run(validateCreateMatch, {
      body: { ...validBody, player1: { name: "Alice", faction: "" } },
    });
    assert.strictEqual(result.isEmpty(), true);
  });
});

describe("result-reporting validation", () => {
  it("passes with a valid winner ID", async () => {
    const { result } = await run(validateReportResult, {
      params: { id: OBJECT_ID },
      body: { winnerId: OTHER_OBJECT_ID },
    });
    assert.strictEqual(result.isEmpty(), true);
  });

  it("fails when winnerId is missing", async () => {
    const { result } = await run(validateReportResult, {
      params: { id: OBJECT_ID },
      body: {},
    });
    assert.ok(failedFields(result).includes("winnerId"));
  });

  it("fails when winnerId is not an ObjectId", async () => {
    const { result } = await run(validateReportResult, {
      params: { id: OBJECT_ID },
      body: { winnerId: { $ne: null } },
    });
    assert.ok(failedFields(result).includes("winnerId"));
  });

  it("allows an optional reason on dispute resolution", async () => {
    const { result } = await run(validateResolveDispute, {
      params: { id: OBJECT_ID },
      body: { winnerId: OTHER_OBJECT_ID },
    });
    assert.strictEqual(result.isEmpty(), true);
  });

  it("fails when an override reason exceeds 500 characters", async () => {
    const { result } = await run(validateOverrideResult, {
      params: { id: OBJECT_ID },
      body: { winnerId: OTHER_OBJECT_ID, reason: "x".repeat(501) },
    });
    assert.ok(failedFields(result).includes("reason"));
  });
});

describe("validateUpdateMatchStatus", () => {
  for (const status of ["pending", "in_progress"]) {
    it(`passes for status "${status}"`, async () => {
      const { result } = await run(validateUpdateMatchStatus, {
        params: { id: OBJECT_ID },
        body: { status },
      });
      assert.strictEqual(result.isEmpty(), true);
    });
  }

  it("rejects statuses that are not admin-settable", async () => {
    const { result } = await run(validateUpdateMatchStatus, {
      params: { id: OBJECT_ID },
      body: { status: "completed" },
    });
    assert.ok(failedFields(result).includes("status"));
  });
});
