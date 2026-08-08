/**
 * The faction registry is deliberately duplicated: the client ships it as TS
 * and the server as ESM, and npm workspaces give them no shared package to
 * import from. Duplication is only safe while the two stay identical — a
 * faction added to one side but not the other means the picker offers a
 * faction the API rejects (or a banned faction the API silently accepts).
 *
 * This test imports the server copy directly and asserts they agree.
 */
import { describe, it, expect } from "vitest";
import {
  factionRegistry,
  allFactions,
  warhammer3Factions,
  warhammer40kFactions,
} from "@/shared/constants/factions";
import * as serverFactions from "../../../server-app/src/constants/factions.js";

describe("faction registry parity between client and server", () => {
  it("has the same registry entries in the same order", () => {
    expect(serverFactions.factionRegistry).toEqual(factionRegistry);
  });

  it("derives the same wh3 roster", () => {
    expect(serverFactions.warhammer3Factions).toEqual(warhammer3Factions);
  });

  it("derives the same 40k roster", () => {
    expect(serverFactions.warhammer40kFactions).toEqual(warhammer40kFactions);
  });

  it("derives the same full faction list", () => {
    expect(serverFactions.allFactions).toEqual(allFactions);
  });

  it("agrees on which factions are beta", () => {
    const clientBeta = factionRegistry
      .filter((f) => f.isBeta)
      .map((f) => f.name)
      .sort();
    expect([...serverFactions.betaFactionNames].sort()).toEqual(clientBeta);
  });
});
