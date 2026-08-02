import assert from "node:assert";
import { describe, it } from "node:test";

import {
  factionRegistry,
  warhammer3Factions,
  warhammer40kFactions,
  allFactions,
  betaFactionNames,
} from "../constants/factions.js";

describe("factionRegistry", () => {
  it("should contain only entries with name, game, and optional isBeta", () => {
    for (const entry of factionRegistry) {
      assert.ok(typeof entry.name === "string" && entry.name.length > 0);
      assert.ok(entry.game === "wh3" || entry.game === "40k");
      if (entry.isBeta !== undefined) {
        assert.strictEqual(typeof entry.isBeta, "boolean");
      }
    }
  });

  it("should have no duplicate faction names", () => {
    const names = factionRegistry.map((f) => f.name);
    const unique = new Set(names);
    assert.strictEqual(unique.size, names.length);
  });

  it("should mark all 40k entries as isBeta: true", () => {
    const entries40k = factionRegistry.filter((f) => f.game === "40k");
    assert.ok(entries40k.length > 0, "Expected at least one 40k faction");
    for (const entry of entries40k) {
      assert.strictEqual(
        entry.isBeta,
        true,
        `Expected ${entry.name} to have isBeta: true`,
      );
    }
  });

  it("should not mark any wh3 entries as isBeta", () => {
    const wh3Entries = factionRegistry.filter((f) => f.game === "wh3");
    for (const entry of wh3Entries) {
      assert.ok(
        !entry.isBeta,
        `Expected ${entry.name} to not have isBeta: true`,
      );
    }
  });
});

describe("warhammer3Factions", () => {
  it("should be a non-empty array of strings", () => {
    assert.ok(Array.isArray(warhammer3Factions));
    assert.ok(warhammer3Factions.length > 0);
    for (const f of warhammer3Factions) assert.strictEqual(typeof f, "string");
  });

  it("should contain expected WH3 factions", () => {
    const expected = ["Empire", "Skaven", "Kislev", "Cathay", "Chaos Dwarfs"];
    for (const name of expected) {
      assert.ok(
        warhammer3Factions.includes(name),
        `Expected warhammer3Factions to include "${name}"`,
      );
    }
  });

  it("should not contain any 40k faction names", () => {
    for (const name of warhammer40kFactions) {
      assert.ok(
        !warhammer3Factions.includes(name),
        `WH3 list should not contain 40k faction "${name}"`,
      );
    }
  });
});

describe("warhammer40kFactions", () => {
  it("should be a non-empty array of strings", () => {
    assert.ok(Array.isArray(warhammer40kFactions));
    assert.ok(warhammer40kFactions.length > 0);
    for (const f of warhammer40kFactions)
      assert.strictEqual(typeof f, "string");
  });

  it("should contain expected 40k factions", () => {
    const expected = [
      "Adeptus Astartes",
      "Heretic Astartes",
      "Aeldari",
      "Drukhari",
      "Adepta Sororitas",
      "Astra Militarum",
      "Necrons",
      "Tyranids",
    ];
    for (const name of expected) {
      assert.ok(
        warhammer40kFactions.includes(name),
        `Expected warhammer40kFactions to include "${name}"`,
      );
    }
  });

  it("should not contain any WH3 faction names", () => {
    for (const name of warhammer3Factions) {
      assert.ok(
        !warhammer40kFactions.includes(name),
        `40k list should not contain WH3 faction "${name}"`,
      );
    }
  });

  it("lists the TW 40k / DoW 4 primary factions before Unification factions", () => {
    const primaryNames = [
      "Adeptus Astartes",
      "Aeldari",
      "Orks",
      "Adeptus Mechanicus",
      "Necrons",
      "Astra Militarum",
    ];
    // Primary six come first, in registry order.
    assert.deepStrictEqual(
      warhammer40kFactions.slice(0, primaryNames.length),
      primaryNames,
    );
    // Every 40k entry is tagged with a known category.
    const entries40k = factionRegistry.filter((f) => f.game === "40k");
    for (const entry of entries40k) {
      assert.ok(
        entry.category === "primary" || entry.category === "unification",
        `40k entry "${entry.name}" missing a known category`,
      );
    }
    // No primary faction appears after a unification faction.
    const firstUnificationIdx = warhammer40kFactions.findIndex((name) => {
      const entry = entries40k.find((f) => f.name === name);
      return entry?.category === "unification";
    });
    if (firstUnificationIdx !== -1) {
      for (const name of warhammer40kFactions.slice(firstUnificationIdx)) {
        const entry = entries40k.find((f) => f.name === name);
        assert.strictEqual(
          entry?.category,
          "unification",
          `Expected "${name}" to be unification after the first unification faction`,
        );
      }
    }
  });
});

describe("allFactions", () => {
  it("should contain all WH3 and 40k factions", () => {
    for (const name of warhammer3Factions) {
      assert.ok(
        allFactions.includes(name),
        `allFactions missing WH3 faction "${name}"`,
      );
    }
    for (const name of warhammer40kFactions) {
      assert.ok(
        allFactions.includes(name),
        `allFactions missing 40k faction "${name}"`,
      );
    }
  });

  it("should equal wh3 + 40k faction counts", () => {
    assert.strictEqual(
      allFactions.length,
      warhammer3Factions.length + warhammer40kFactions.length,
    );
  });
});

describe("betaFactionNames", () => {
  it("should be a Set", () => {
    assert.ok(betaFactionNames instanceof Set);
  });

  it("should contain all 40k faction names", () => {
    for (const name of warhammer40kFactions) {
      assert.ok(
        betaFactionNames.has(name),
        `betaFactionNames missing 40k faction "${name}"`,
      );
    }
  });

  it("should not contain any WH3 faction names", () => {
    for (const name of warhammer3Factions) {
      assert.ok(
        !betaFactionNames.has(name),
        `betaFactionNames should not contain WH3 faction "${name}"`,
      );
    }
  });

  it("should have the same size as warhammer40kFactions", () => {
    assert.strictEqual(betaFactionNames.size, warhammer40kFactions.length);
  });
});
