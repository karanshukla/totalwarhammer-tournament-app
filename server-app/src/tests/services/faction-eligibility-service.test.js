import assert from "node:assert";
import { describe, it } from "node:test";

import {
  factionRejectionReason,
  gameSystemLabel,
  gameSystemOf,
  selectableFactions,
} from "../../domain/services/faction-eligibility-service.js";

const wh3Tournament = (overrides = {}) => ({
  enable40kFactions: false,
  bannedFactions: [],
  ...overrides,
});

const k40Tournament = (overrides = {}) => ({
  enable40kFactions: true,
  bannedFactions: [],
  ...overrides,
});

describe("gameSystemOf", () => {
  it("reads wh3 from a tournament without the 40k flag", () => {
    assert.strictEqual(gameSystemOf(wh3Tournament()), "wh3");
  });

  it("reads 40k from a tournament with the flag set", () => {
    assert.strictEqual(gameSystemOf(k40Tournament()), "40k");
  });

  it("treats a legacy tournament with no flag at all as wh3", () => {
    assert.strictEqual(gameSystemOf({}), "wh3");
  });

  it("treats a missing tournament as wh3", () => {
    assert.strictEqual(gameSystemOf(undefined), "wh3");
  });
});

describe("gameSystemLabel", () => {
  it("labels each game system", () => {
    assert.strictEqual(gameSystemLabel("wh3"), "Warhammer III");
    assert.strictEqual(gameSystemLabel("40k"), "Warhammer 40,000");
  });
});

describe("selectableFactions", () => {
  it("returns only the tournament's game system factions", () => {
    const wh3 = selectableFactions(wh3Tournament());
    assert.ok(wh3.includes("Skaven"));
    assert.ok(!wh3.includes("Necrons"));

    const k40 = selectableFactions(k40Tournament());
    assert.ok(k40.includes("Necrons"));
    assert.ok(!k40.includes("Skaven"));
  });

  it("omits banned factions", () => {
    const factions = selectableFactions(
      wh3Tournament({ bannedFactions: ["Skaven", "Empire"] }),
    );
    assert.ok(!factions.includes("Skaven"));
    assert.ok(!factions.includes("Empire"));
    assert.ok(factions.includes("Dwarfs"));
  });

  it("tolerates a tournament with no bannedFactions field", () => {
    assert.ok(selectableFactions({ enable40kFactions: true }).length > 0);
  });
});

describe("factionRejectionReason", () => {
  it("allows a faction from the tournament's own game system", () => {
    assert.strictEqual(factionRejectionReason(wh3Tournament(), "Skaven"), null);
    assert.strictEqual(factionRejectionReason(k40Tournament(), "Orks"), null);
  });

  it("allows an undeclared faction", () => {
    assert.strictEqual(factionRejectionReason(k40Tournament(), ""), null);
    assert.strictEqual(factionRejectionReason(k40Tournament(), null), null);
    assert.strictEqual(
      factionRejectionReason(k40Tournament(), undefined),
      null,
    );
  });

  it("rejects a wh3 faction in a 40k tournament", () => {
    const reason = factionRejectionReason(k40Tournament(), "Skaven");
    assert.match(reason, /Warhammer 40,000/);
    assert.match(reason, /Skaven/);
  });

  it("rejects a 40k faction in a wh3 tournament", () => {
    const reason = factionRejectionReason(wh3Tournament(), "Necrons");
    assert.match(reason, /Warhammer III/);
    assert.match(reason, /Necrons/);
  });

  it("rejects an unknown faction outright", () => {
    assert.match(
      factionRejectionReason(wh3Tournament(), "Sisters of Battle"),
      /not a Warhammer III faction/,
    );
  });

  it("rejects a banned faction from the right game system", () => {
    const reason = factionRejectionReason(
      k40Tournament({ bannedFactions: ["Orks"] }),
      "Orks",
    );
    assert.match(reason, /banned/);
  });
});
