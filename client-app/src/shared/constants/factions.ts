export type FactionGame = "wh3" | "40k";

/**
 * 40k faction source/lineage, used only to sort the faction picker.
 * - "primary": core TW 40k / DoW 4 factions — shown first in the picker.
 * - "unification": community Unification-mod factions — shown below the primary set.
 * WH3 entries carry no category.
 */
export type Faction40kCategory = "primary" | "unification";

export interface FactionEntry {
  name: string;
  game: FactionGame;
  isBeta?: boolean;
  category?: Faction40kCategory;
}

export const factionRegistry: FactionEntry[] = [
  // Warhammer 3 factions
  { name: "Empire", game: "wh3" },
  { name: "Dwarfs", game: "wh3" },
  { name: "Greenskins", game: "wh3" },
  { name: "Vampire Counts", game: "wh3" },
  { name: "Warriors of Chaos", game: "wh3" },
  { name: "Beastmen", game: "wh3" },
  { name: "Wood Elves", game: "wh3" },
  { name: "Bretonnia", game: "wh3" },
  { name: "Norsca", game: "wh3" },
  { name: "High Elves", game: "wh3" },
  { name: "Dark Elves", game: "wh3" },
  { name: "Lizardmen", game: "wh3" },
  { name: "Skaven", game: "wh3" },
  { name: "Tomb Kings", game: "wh3" },
  { name: "Vampire Coast", game: "wh3" },
  { name: "Kislev", game: "wh3" },
  { name: "Cathay", game: "wh3" },
  { name: "Ogre Kingdoms", game: "wh3" },
  { name: "Daemons of Chaos", game: "wh3" },
  { name: "Khorne", game: "wh3" },
  { name: "Nurgle", game: "wh3" },
  { name: "Slaanesh", game: "wh3" },
  { name: "Tzeentch", game: "wh3" },
  { name: "Chaos Dwarfs", game: "wh3" },

  // Warhammer 40,000 — TW 40k / DoW 4 primary factions (beta)
  // Core lineups; shown first in the faction picker.
  { name: "Adeptus Astartes", game: "40k", isBeta: true, category: "primary" },
  { name: "Aeldari", game: "40k", isBeta: true, category: "primary" },
  { name: "Orks", game: "40k", isBeta: true, category: "primary" },
  { name: "Adeptus Mechanicus", game: "40k", isBeta: true, category: "primary" },
  { name: "Necrons", game: "40k", isBeta: true, category: "primary" },
  { name: "Astra Militarum", game: "40k", isBeta: true, category: "primary" },

  // Warhammer 40,000 — Unification / DoW modded factions (beta)
  // Vanilla DoW factions not covered above
  { name: "Heretic Astartes", game: "40k", isBeta: true, category: "unification" },
  { name: "Harlequins", game: "40k", isBeta: true, category: "unification" },
  { name: "Ynnari", game: "40k", isBeta: true, category: "unification" },
  { name: "T'au Empire", game: "40k", isBeta: true, category: "unification" },
  { name: "Farsight Enclaves", game: "40k", isBeta: true, category: "unification" },
  { name: "Drukhari", game: "40k", isBeta: true, category: "unification" },
  { name: "Adepta Sororitas", game: "40k", isBeta: true, category: "unification" },
  { name: "Tyranids", game: "40k", isBeta: true, category: "unification" },
  // Adeptus Astartes sub-factions
  { name: "13th Company (Space Wolves)", game: "40k", isBeta: true, category: "unification" },
  { name: "Black Templars", game: "40k", isBeta: true, category: "unification" },
  { name: "Blood Angels", game: "40k", isBeta: true, category: "unification" },
  { name: "Dark Angels", game: "40k", isBeta: true, category: "unification" },
  { name: "Daemon Hunters (Grey Knights)", game: "40k", isBeta: true, category: "unification" },
  { name: "Imperial Fists", game: "40k", isBeta: true, category: "unification" },
  { name: "Legion of the Damned", game: "40k", isBeta: true, category: "unification" },
  { name: "Raven Guard", game: "40k", isBeta: true, category: "unification" },
  { name: "Salamanders", game: "40k", isBeta: true, category: "unification" },
  // Imperium
  { name: "Adeptus Custodes", game: "40k", isBeta: true, category: "unification" },
  { name: "Death Korps of Krieg", game: "40k", isBeta: true, category: "unification" },
  { name: "Praetorian Guard", game: "40k", isBeta: true, category: "unification" },
  { name: "Steel Legion", game: "40k", isBeta: true, category: "unification" },
  { name: "Vostroyan Firstborn", game: "40k", isBeta: true, category: "unification" },
  { name: "Witch Hunters (Ordo Hereticus)", game: "40k", isBeta: true, category: "unification" },
  // Chaos
  { name: "Chaos Daemons", game: "40k", isBeta: true, category: "unification" },
  { name: "Death Guard", game: "40k", isBeta: true, category: "unification" },
  { name: "Emperor's Children", game: "40k", isBeta: true, category: "unification" },
  { name: "Fallen Angels", game: "40k", isBeta: true, category: "unification" },
  { name: "Night Lords", game: "40k", isBeta: true, category: "unification" },
  { name: "Renegade Guard", game: "40k", isBeta: true, category: "unification" },
  { name: "Thousand Sons", game: "40k", isBeta: true, category: "unification" },
  { name: "World Eaters", game: "40k", isBeta: true, category: "unification" },
];

export const warhammer3Factions = factionRegistry
  .filter((f) => f.game === "wh3")
  .map((f) => f.name);

// 40k factions are returned with the TW 40k / DoW 4 "primary" core lineups first,
// followed by the Unification / DoW modded factions. The registry keeps primary
// entries grouped at the top; this stable sort makes the ordering explicit so a
// future unsorted append can't silently re-bury the primary set.
const primaryFirst: Record<Faction40kCategory, number> = {
  primary: 0,
  unification: 1,
};
export const warhammer40kFactions = factionRegistry
  .filter((f) => f.game === "40k")
  .slice()
  .sort((a, b) => primaryFirst[a.category!] - primaryFirst[b.category!])
  .map((f) => f.name);

export const allFactions = factionRegistry.map((f) => f.name);

export function getFactionsForGame(game: FactionGame): string[] {
  return factionRegistry.filter((f) => f.game === game).map((f) => f.name);
}

export function isBetaFactionName(name: string): boolean {
  return factionRegistry.some((f) => f.name === name && f.isBeta === true);
}
