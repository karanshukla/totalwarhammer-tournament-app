import {
  Participant,
  Round,
} from "@/features/tournaments/components/bracket/types";
import { warhammer3Factions } from "../constants/factions";

/** The 8-player demo roster the local bracket builder starts from. */
export const createDefaultParticipants = (): Participant[] => [
  { id: "p1", name: "Player 1", faction: "Empire" },
  { id: "p2", name: "Player 2", faction: "Dwarfs" },
  { id: "p3", name: "Player 3", faction: "Greenskins" },
  { id: "p4", name: "Player 4", faction: "Vampire Counts" },
  { id: "p5", name: "Player 5", faction: "Bretonnia" },
  { id: "p6", name: "Player 6", faction: "High Elves" },
  { id: "p7", name: "Player 7", faction: "Dark Elves" },
  { id: "p8", name: "Player 8", faction: "Lizardmen" },
];

/** The 8-player single-elimination bracket (quarters, semis, final) matching `createDefaultParticipants`. */
export const populateTournamentDefaultBracket = (): Round[] => {
  return [
    {
      id: "r1",
      title: "Round 1",
      matches: [
        {
          id: "m1",
          title: "Match 1",
          bestOf: 3,
          roundId: "r1",
          participant1Id: "p1",
          participant2Id: "p2",
          winnerId: null,
        },
        {
          id: "m2",
          title: "Match 2",
          bestOf: 3,
          roundId: "r1",
          participant1Id: "p3",
          participant2Id: "p4",
          winnerId: null,
        },
        {
          id: "m3",
          title: "Match 3",
          bestOf: 3,
          roundId: "r1",
          participant1Id: "p5",
          participant2Id: "p6",
          winnerId: null,
        },
        {
          id: "m4",
          title: "Match 4",
          bestOf: 3,
          roundId: "r1",
          participant1Id: "p7",
          participant2Id: "p8",
          winnerId: null,
        },
      ],
    },
    {
      id: "r2",
      title: "Semi-Finals",
      matches: [
        {
          id: "m5",
          title: "Match 5",
          bestOf: 3,
          roundId: "r2",
          participant1Id: null,
          participant2Id: null,
          winnerId: null,
        },
        {
          id: "m6",
          title: "Match 6",
          bestOf: 3,
          roundId: "r2",
          participant1Id: null,
          participant2Id: null,
          winnerId: null,
        },
      ],
    },
    {
      id: "r3",
      title: "Finals",
      matches: [
        {
          id: "m7",
          title: "Final Match",
          bestOf: 5,
          roundId: "r3",
          participant1Id: null,
          participant2Id: null,
          winnerId: null,
        },
      ],
    },
  ];
};

/** A random faction, used to seed a participant added via `addParticipants`. */
export const randomFaction = (): string =>
  warhammer3Factions[Math.floor(Math.random() * warhammer3Factions.length)];
