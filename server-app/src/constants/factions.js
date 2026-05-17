/**
 * Unified faction registry.
 * Adding new faction types here propagates to validation and stats filtering automatically.
 */
export const factionRegistry = [
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

  // Warhammer 40,000 — Dawn of War vanilla factions (beta)
  { name: "Adeptus Astartes", game: "40k", isBeta: true },
  { name: "Heretic Astartes", game: "40k", isBeta: true },
  { name: "Orks", game: "40k", isBeta: true },
  { name: "Aeldari", game: "40k", isBeta: true },
  { name: "Harlequins", game: "40k", isBeta: true },
  { name: "Ynnari", game: "40k", isBeta: true },
  { name: "Astra Militarum", game: "40k", isBeta: true },
  { name: "T'au Empire", game: "40k", isBeta: true },
  { name: "Farsight Enclaves", game: "40k", isBeta: true },
  { name: "Necrons", game: "40k", isBeta: true },
  { name: "Drukhari", game: "40k", isBeta: true },
  { name: "Adepta Sororitas", game: "40k", isBeta: true },
  { name: "Tyranids", game: "40k", isBeta: true },

  // Warhammer 40,000 — Dawn of War modded factions (beta)
  // Adeptus Astartes sub-factions
  { name: "13th Company (Space Wolves)", game: "40k", isBeta: true },
  { name: "Black Templars", game: "40k", isBeta: true },
  { name: "Blood Angels", game: "40k", isBeta: true },
  { name: "Dark Angels", game: "40k", isBeta: true },
  { name: "Daemon Hunters (Grey Knights)", game: "40k", isBeta: true },
  { name: "Imperial Fists", game: "40k", isBeta: true },
  { name: "Legion of the Damned", game: "40k", isBeta: true },
  { name: "Raven Guard", game: "40k", isBeta: true },
  { name: "Salamanders", game: "40k", isBeta: true },
  // Imperium
  { name: "Adeptus Custodes", game: "40k", isBeta: true },
  { name: "Adeptus Mechanicus Explorators", game: "40k", isBeta: true },
  { name: "Death Korps of Krieg", game: "40k", isBeta: true },
  { name: "Praetorian Guard", game: "40k", isBeta: true },
  { name: "Steel Legion", game: "40k", isBeta: true },
  { name: "Vostroyan Firstborn", game: "40k", isBeta: true },
  { name: "Witch Hunters (Ordo Hereticus)", game: "40k", isBeta: true },
  // Chaos
  { name: "Chaos Daemons", game: "40k", isBeta: true },
  { name: "Death Guard", game: "40k", isBeta: true },
  { name: "Emperor's Children", game: "40k", isBeta: true },
  { name: "Fallen Angels", game: "40k", isBeta: true },
  { name: "Night Lords", game: "40k", isBeta: true },
  { name: "Renegade Guard", game: "40k", isBeta: true },
  { name: "Thousand Sons", game: "40k", isBeta: true },
  { name: "World Eaters", game: "40k", isBeta: true },
];

export const warhammer3Factions = factionRegistry
  .filter((f) => f.game === "wh3")
  .map((f) => f.name);

export const warhammer40kFactions = factionRegistry
  .filter((f) => f.game === "40k")
  .map((f) => f.name);

export const allFactions = factionRegistry.map((f) => f.name);

export const betaFactionNames = new Set(
  factionRegistry.filter((f) => f.isBeta).map((f) => f.name),
);
