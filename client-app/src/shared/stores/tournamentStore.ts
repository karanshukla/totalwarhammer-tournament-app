import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { arrayMove } from "@dnd-kit/sortable";
import {
  Participant,
  Round,
  FACTIONS,
} from "@/features/tournaments/components/bracket/types";

// Helper to create default participants
const createDefaultParticipants = (): Participant[] => [
  { id: "p1", name: "Player 1", faction: "Empire" },
  { id: "p2", name: "Player 2", faction: "Dwarfs" },
  { id: "p3", name: "Player 3", faction: "Greenskins" },
  { id: "p4", name: "Player 4", faction: "Vampire Counts" },
  { id: "p5", name: "Player 5", faction: "Bretonnia" },
  { id: "p6", name: "Player 6", faction: "High Elves" },
  { id: "p7", name: "Player 7", faction: "Dark Elves" },
  { id: "p8", name: "Player 8", faction: "Lizardmen" },
];

// Helper to populate the default bracket structure
const populateTournamentDefaultBracket = (): Round[] => {
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

interface TournamentState {
  participants: Participant[];
  rounds: Round[];
  lastUpdated: string | null;
  // Actions
  addParticipants: (count: number) => void;
  updateParticipant: (updatedParticipant: Participant) => void;
  deleteParticipant: (participantId: string) => void;
  reorderParticipants: (activeId: string, overId: string) => void;

  addRound: () => void;
  addMatchToRound: (roundId: string) => void;
  removeMatch: (matchId: string) => void;
  updateMatchParticipant: (
    matchId: string,
    position: "participant1Id" | "participant2Id",
    participantId: string | null
  ) => void;

  resetBracket: () => void;
  resetParticipantsAndBracket: () => void;
}

export const useTournamentStore = create<TournamentState>()(
  persist(
    (set) => ({
      // Removed unused get parameter
      participants: createDefaultParticipants(),
      rounds: populateTournamentDefaultBracket(),
      lastUpdated: new Date().toISOString(),

      addParticipants: (count) =>
        set((state) => {
          const currentCount = state.participants.length;
          const newParticipants: Participant[] = [];
          for (let i = 0; i < count; i++) {
            newParticipants.push({
              id: `p${currentCount + i + Date.now()}`, // Unique ID
              name: `Player ${currentCount + i + 1}`,
              faction: FACTIONS[Math.floor(Math.random() * FACTIONS.length)],
            });
          }
          return {
            participants: [...state.participants, ...newParticipants],
            lastUpdated: new Date().toISOString(),
          };
        }),

      updateParticipant: (updatedParticipant) =>
        set((state) => ({
          participants: state.participants.map((p) =>
            p.id === updatedParticipant.id ? updatedParticipant : p
          ),
          lastUpdated: new Date().toISOString(),
        })),

      deleteParticipant: (participantId) =>
        set((state) => {
          const newParticipants = state.participants.filter(
            (p) => p.id !== participantId
          );
          const newRounds = state.rounds.map((round) => ({
            ...round,
            matches: round.matches.map((match) => ({
              ...match,
              participant1Id:
                match.participant1Id === participantId
                  ? null
                  : match.participant1Id,
              participant2Id:
                match.participant2Id === participantId
                  ? null
                  : match.participant2Id,
              winnerId:
                match.winnerId === participantId ? null : match.winnerId,
            })),
          }));
          return {
            participants: newParticipants,
            rounds: newRounds,
            lastUpdated: new Date().toISOString(),
          };
        }),

      reorderParticipants: (activeId, overId) =>
        set((state) => {
          const oldIndex = state.participants.findIndex(
            (p) => p.id === activeId
          );
          const newIndex = state.participants.findIndex((p) => p.id === overId);
          if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
            return {
              participants: arrayMove(state.participants, oldIndex, newIndex),
              lastUpdated: new Date().toISOString(),
            };
          }
          return {};
        }),

      addRound: () =>
        set((state) => {
          const numericRounds = state.rounds
            .map((r) => {
              const match = r.title.match(/Round\s+(\d+)/i); // Fixed regex escape
              return match ? parseInt(match[1], 10) : 0;
            })
            .filter((n) => !isNaN(n));
          const highestRoundNumber =
            numericRounds.length > 0 ? Math.max(...numericRounds) : 0;
          const nextRoundNumber = highestRoundNumber + 1;
          const newRoundId = `r${Date.now()}`; // Fixed template literal
          return {
            rounds: [
              ...state.rounds,
              {
                id: newRoundId,
                title: `Round ${nextRoundNumber}`,
                matches: [],
              }, // Fixed template literal
            ],
            lastUpdated: new Date().toISOString(),
          };
        }),

      addMatchToRound: (roundId) =>
        set((state) => ({
          rounds: state.rounds.map((round) => {
            if (round.id === roundId) {
              const newMatchId = `m${Date.now()}`; // Fixed template literal
              return {
                ...round,
                matches: [
                  ...round.matches,
                  {
                    id: newMatchId,
                    title: `Match ${round.matches.length + 1}`,
                    bestOf: 3,
                    roundId,
                    participant1Id: null,
                    participant2Id: null,
                    winnerId: null,
                  }, // Fixed template literal
                ],
              };
            }
            return round;
          }),
          lastUpdated: new Date().toISOString(),
        })),

      removeMatch: (matchId) =>
        set((state) => ({
          rounds: state.rounds.map((round) => ({
            ...round,
            matches: round.matches.filter((match) => match.id !== matchId),
          })),
          lastUpdated: new Date().toISOString(),
        })),

      updateMatchParticipant: (matchId, position, participantId) =>
        set((state) => ({
          rounds: state.rounds.map((round) => ({
            ...round,
            matches: round.matches.map((match) => {
              if (match.id === matchId) {
                return { ...match, [position]: participantId };
              }
              return match;
            }),
          })),
          lastUpdated: new Date().toISOString(),
        })),

      resetBracket: () =>
        set({
          rounds: populateTournamentDefaultBracket(), // Resets to the static default structure
          lastUpdated: new Date().toISOString(),
        }),

      resetParticipantsAndBracket: () =>
        set({
          participants: createDefaultParticipants(),
          rounds: populateTournamentDefaultBracket(),
          lastUpdated: new Date().toISOString(),
        }),
    }),
    {
      name: "tournament-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
