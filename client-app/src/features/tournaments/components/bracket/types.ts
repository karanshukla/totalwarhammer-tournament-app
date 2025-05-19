// Define basic types for the tournament bracket
export interface Participant {
  id: string;
  name: string;
  faction: string;
}

export interface Match {
  id: string;
  title: string;
  roundId: string;
  bestOf: number;
  participant1Id: string | null;
  participant2Id: string | null;
  winnerId: string | null;
}

export interface Round {
  id: string;
  title: string;
  matches: Match[];
}

// Total War: Warhammer factions (simplified list)
export const FACTIONS = [
  "Empire",
  "Dwarfs",
  "Greenskins",
  "Vampire Counts",
  "Bretonnia",
  "High Elves",
  "Dark Elves",
  "Lizardmen",
  "Skaven",
  "Tomb Kings",
  "Vampire Coast",
  "Warriors of Chaos",
  "Beastmen",
  "Wood Elves",
  "Norsca",
  "Chaos Dwarfs",
  "Daemons of Chaos",
  "Cathay",
  "Ogre Kingdoms",
  "Kislev",
  "Tzeentch",
  "Nurgle",
  "Slaanesh",
  "Khorne",
];
