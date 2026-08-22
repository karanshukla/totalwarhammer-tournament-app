/**
 * Branch coverage for interfaces/http/middleware/validation/stats-validation.js:
 * validateGlobalStatsQuery:
 *   - empty query → pass (back-compat: every param is optional)
 *   - each supported range → pass
 *   - unknown range → error
 *   - limit/offset within bounds → pass and coerced to numbers
 *   - limit below 1, limit above the cap, negative offset → error
 * validateUserStatsQuery:
 *   - detail summary/full → pass
 *   - unknown detail → error
 *   - inherits the shared range/limit/offset rules
 */
import assert from "node:assert";
import { describe, it } from "node:test";

import { validationResult } from "express-validator";

import { MAX_LIST_LIMIT } from "../infrastructure/services/stats-service.js";
import {
  validateGlobalStatsQuery,
  validateUserStatsQuery,
} from "../interfaces/http/middleware/validation/stats-validation.js";

async function runChain(chains, query = {}) {
  const req = { body: {}, query, params: {}, headers: {} };
  for (const chain of chains) {
    await chain.run(req);
  }
  return { req, errors: validationResult(req) };
}

const fieldsWithErrors = (errors) => errors.array().map((error) => error.path);

describe("stats-validation", () => {
  describe("validateGlobalStatsQuery", () => {
    it("accepts an empty query so existing callers keep working", async () => {
      const { errors } = await runChain(validateGlobalStatsQuery);
      assert.ok(errors.isEmpty());
    });

    it("accepts every supported range", async () => {
      for (const range of ["7d", "30d", "90d", "all"]) {
        const { errors } = await runChain(validateGlobalStatsQuery, { range });
        assert.ok(errors.isEmpty(), `${range} should be accepted`);
      }
    });

    it("rejects an unknown range", async () => {
      const { errors } = await runChain(validateGlobalStatsQuery, {
        range: "1y",
      });
      assert.deepStrictEqual(fieldsWithErrors(errors), ["range"]);
    });

    it("coerces limit and offset to integers", async () => {
      const { req, errors } = await runChain(validateGlobalStatsQuery, {
        limit: "25",
        offset: "50",
      });
      assert.ok(errors.isEmpty());
      assert.strictEqual(req.query.limit, 25);
      assert.strictEqual(req.query.offset, 50);
    });

    it("rejects a limit below 1", async () => {
      const { errors } = await runChain(validateGlobalStatsQuery, { limit: 0 });
      assert.deepStrictEqual(fieldsWithErrors(errors), ["limit"]);
    });

    it("rejects a limit above the cap", async () => {
      const { errors } = await runChain(validateGlobalStatsQuery, {
        limit: MAX_LIST_LIMIT + 1,
      });
      assert.deepStrictEqual(fieldsWithErrors(errors), ["limit"]);
    });

    it("rejects a negative offset", async () => {
      const { errors } = await runChain(validateGlobalStatsQuery, {
        offset: -1,
      });
      assert.deepStrictEqual(fieldsWithErrors(errors), ["offset"]);
    });
  });

  describe("validateUserStatsQuery", () => {
    it("accepts both detail levels", async () => {
      for (const detail of ["summary", "full"]) {
        const { errors } = await runChain(validateUserStatsQuery, { detail });
        assert.ok(errors.isEmpty(), `${detail} should be accepted`);
      }
    });

    it("rejects an unknown detail level", async () => {
      const { errors } = await runChain(validateUserStatsQuery, {
        detail: "everything",
      });
      assert.deepStrictEqual(fieldsWithErrors(errors), ["detail"]);
    });

    it("inherits the shared range rule", async () => {
      const { errors } = await runChain(validateUserStatsQuery, {
        range: "forever",
      });
      assert.deepStrictEqual(fieldsWithErrors(errors), ["range"]);
    });
  });
});
