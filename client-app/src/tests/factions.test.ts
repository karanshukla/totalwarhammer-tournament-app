import { describe, it, expect } from "vitest";
import {
  factionRegistry,
  warhammer3Factions,
  warhammer40kFactions,
  allFactions,
  isBetaFactionName,
  getFactionsForGame,
} from "@/shared/constants/factions";

describe("factionRegistry", () => {
  it("should contain no duplicate faction names", () => {
    const names = factionRegistry.map((f) => f.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("should only have game values of 'wh3' or '40k'", () => {
    for (const entry of factionRegistry) {
      expect(["wh3", "40k"]).toContain(entry.game);
    }
  });

  it("should mark every 40k entry with isBeta: true", () => {
    const entries40k = factionRegistry.filter((f) => f.game === "40k");
    expect(entries40k.length).toBeGreaterThan(0);
    for (const entry of entries40k) {
      expect(entry.isBeta).toBe(true);
    }
  });

  it("should not mark any wh3 entry with isBeta: true", () => {
    const wh3Entries = factionRegistry.filter((f) => f.game === "wh3");
    for (const entry of wh3Entries) {
      expect(entry.isBeta).not.toBe(true);
    }
  });
});

describe("warhammer3Factions", () => {
  it("should be a non-empty string array", () => {
    expect(warhammer3Factions.length).toBeGreaterThan(0);
    for (const f of warhammer3Factions) expect(typeof f).toBe("string");
  });

  it("should include core WH3 factions", () => {
    expect(warhammer3Factions).toContain("Empire");
    expect(warhammer3Factions).toContain("Skaven");
    expect(warhammer3Factions).toContain("Kislev");
    expect(warhammer3Factions).toContain("Cathay");
    expect(warhammer3Factions).toContain("Chaos Dwarfs");
  });

  it("should not contain any 40k faction names", () => {
    for (const name of warhammer40kFactions) {
      expect(warhammer3Factions).not.toContain(name);
    }
  });
});

describe("warhammer40kFactions", () => {
  it("should be a non-empty string array", () => {
    expect(warhammer40kFactions.length).toBeGreaterThan(0);
    for (const f of warhammer40kFactions) expect(typeof f).toBe("string");
  });

  it("should include core vanilla 40k factions using official GW names", () => {
    expect(warhammer40kFactions).toContain("Adeptus Astartes");
    expect(warhammer40kFactions).toContain("Heretic Astartes");
    expect(warhammer40kFactions).toContain("Aeldari");
    expect(warhammer40kFactions).toContain("Drukhari");
    expect(warhammer40kFactions).toContain("Adepta Sororitas");
    expect(warhammer40kFactions).toContain("Astra Militarum");
    expect(warhammer40kFactions).toContain("Necrons");
    expect(warhammer40kFactions).toContain("Tyranids");
  });

  it("should include modded DoW factions", () => {
    expect(warhammer40kFactions).toContain("Death Guard");
    expect(warhammer40kFactions).toContain("Thousand Sons");
    expect(warhammer40kFactions).toContain("Blood Angels");
    expect(warhammer40kFactions).toContain("Daemon Hunters (Grey Knights)");
    expect(warhammer40kFactions).toContain("Death Korps of Krieg");
    expect(warhammer40kFactions).toContain("World Eaters");
  });

  it("should include Unification mod factions", () => {
    expect(warhammer40kFactions).toContain("Harlequins");
    expect(warhammer40kFactions).toContain("Ynnari");
    expect(warhammer40kFactions).toContain("Farsight Enclaves");
    expect(warhammer40kFactions).toContain("Adeptus Custodes");
  });

  it("should not use deprecated names (Eldar, Dark Eldar, Sisters of Battle, etc.)", () => {
    expect(warhammer40kFactions).not.toContain("Eldar");
    expect(warhammer40kFactions).not.toContain("Dark Eldar");
    expect(warhammer40kFactions).not.toContain("Sisters of Battle");
    expect(warhammer40kFactions).not.toContain("Space Marines");
    expect(warhammer40kFactions).not.toContain("Imperial Guard");
    expect(warhammer40kFactions).not.toContain("Chaos Space Marines");
  });

  it("should not contain any WH3 faction names", () => {
    for (const name of warhammer3Factions) {
      expect(warhammer40kFactions).not.toContain(name);
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
    expect(warhammer40kFactions.slice(0, primaryNames.length)).toEqual(
      primaryNames,
    );
    // Every primary entry is tagged primary; the rest are unification.
    const entries40k = factionRegistry.filter((f) => f.game === "40k");
    for (const entry of entries40k) {
      expect(["primary", "unification"]).toContain(entry.category);
    }
    // No primary faction appears after a unification faction.
    const firstUnificationIdx = warhammer40kFactions.findIndex((name) => {
      const entry = entries40k.find((f) => f.name === name);
      return entry?.category === "unification";
    });
    if (firstUnificationIdx !== -1) {
      for (const name of warhammer40kFactions.slice(firstUnificationIdx)) {
        const entry = entries40k.find((f) => f.name === name);
        expect(entry?.category).toBe("unification");
      }
    }
  });
});

describe("allFactions", () => {
  it("should contain every WH3 faction", () => {
    for (const name of warhammer3Factions) {
      expect(allFactions).toContain(name);
    }
  });

  it("should contain every 40k faction", () => {
    for (const name of warhammer40kFactions) {
      expect(allFactions).toContain(name);
    }
  });

  it("should have length equal to WH3 + 40k counts", () => {
    expect(allFactions.length).toBe(
      warhammer3Factions.length + warhammer40kFactions.length,
    );
  });
});

describe("isBetaFactionName", () => {
  it("returns true for every 40k faction", () => {
    for (const name of warhammer40kFactions) {
      expect(isBetaFactionName(name)).toBe(true);
    }
  });

  it("returns false for every WH3 faction", () => {
    for (const name of warhammer3Factions) {
      expect(isBetaFactionName(name)).toBe(false);
    }
  });

  it("returns false for an unknown name", () => {
    expect(isBetaFactionName("Space Communists")).toBe(false);
    expect(isBetaFactionName("")).toBe(false);
  });
});

describe("getFactionsForGame", () => {
  it("returns the same list as warhammer3Factions for 'wh3'", () => {
    expect(getFactionsForGame("wh3")).toEqual(warhammer3Factions);
  });

  it("returns the same list as warhammer40kFactions for '40k'", () => {
    expect(getFactionsForGame("40k")).toEqual(warhammer40kFactions);
  });
});
