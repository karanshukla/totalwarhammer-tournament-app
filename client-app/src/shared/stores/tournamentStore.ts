import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { arrayMove } from "@dnd-kit/sortable";
import {
  Participant,
  Round,
} from "@/features/tournaments/components/bracket/types";
import { uniqueId } from "../utils/id";
import {
  createDefaultParticipants,
  populateTournamentDefaultBracket,
  randomFaction,
} from "./tournamentDefaults";
import {
  sortRounds,
  renumberAllMatchTitlesGlobally,
} from "./tournamentRoundOrdering";

interface TournamentState {
  participants: Participant[];
  rounds: Round[];
  lastUpdated: string | null;

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
    participantId: string | null,
  ) => void;

  resetBracket: () => void;
  resetParticipantsAndBracket: () => void;
}

const buildInitialRounds = (): Round[] =>
  renumberAllMatchTitlesGlobally(
    sortRounds(populateTournamentDefaultBracket()),
  );

export const useTournamentStore = create<TournamentState>()(
  persist(
    (set) => ({
      participants: createDefaultParticipants(),
      rounds: buildInitialRounds(),
      lastUpdated: new Date().toISOString(),

      addParticipants: (count) =>
        set((state) => {
          const currentCount = state.participants.length;
          const newParticipants: Participant[] = [];
          for (let i = 0; i < count; i++) {
            newParticipants.push({
              id: uniqueId("p"),
              name: `Player ${currentCount + i + 1}`,
              faction: randomFaction(),
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
            p.id === updatedParticipant.id ? updatedParticipant : p,
          ),
          lastUpdated: new Date().toISOString(),
        })),

      deleteParticipant: (participantId) =>
        set((state) => {
          const newParticipants = state.participants.filter(
            (p) => p.id !== participantId,
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
            (p) => p.id === activeId,
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
          const existingRoundNumbers = state.rounds
            .map((r) => {
              const match = r.title.match(/Round\s+(\d+)/i);
              return match ? parseInt(match[1], 10) : 0;
            })
            .filter((n) => !isNaN(n) && n > 0);
          const highestRoundNumber =
            existingRoundNumbers.length > 0
              ? Math.max(...existingRoundNumbers)
              : 0;
          const nextRoundNumber = highestRoundNumber + 1;

          const newRound: Round = {
            id: uniqueId("r"),
            title: `Round ${nextRoundNumber}`,
            matches: [],
          };

          const updatedRounds = renumberAllMatchTitlesGlobally(
            sortRounds([...state.rounds, newRound]),
          );

          return {
            rounds: updatedRounds,
            lastUpdated: new Date().toISOString(),
          };
        }),

      addMatchToRound: (roundId) =>
        set((state) => {
          const newRounds = state.rounds.map((r) => {
            if (r.id === roundId) {
              const newMatch = {
                id: uniqueId("m"),
                title: "Match", // placeholder; renumberAllMatchTitlesGlobally assigns the real number below
                bestOf: 3,
                roundId: r.id,
                participant1Id: null,
                participant2Id: null,
                winnerId: null,
              };
              return {
                ...r,
                matches: [...r.matches, newMatch],
              };
            }
            return r;
          });
          // state.rounds is already sorted, so newRounds keeps that round order
          return {
            rounds: renumberAllMatchTitlesGlobally(newRounds),
            lastUpdated: new Date().toISOString(),
          };
        }),

      removeMatch: (matchId) =>
        set((state) => {
          const roundsWithMatchRemoved = state.rounds.map((round) => ({
            ...round,
            matches: round.matches.filter((match) => match.id !== matchId),
          }));
          // A round that becomes empty stays in the list; the UI is expected
          // to handle rendering an empty round rather than this pruning it.
          return {
            rounds: renumberAllMatchTitlesGlobally(roundsWithMatchRemoved),
            lastUpdated: new Date().toISOString(),
          };
        }),

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
        set(() => ({
          rounds: buildInitialRounds(),
          lastUpdated: new Date().toISOString(),
        })),

      resetParticipantsAndBracket: () =>
        set(() => ({
          participants: createDefaultParticipants(),
          rounds: buildInitialRounds(),
          lastUpdated: new Date().toISOString(),
        })),
    }),
    {
      name: "tournament-storage",
      storage: createJSONStorage(() => localStorage),
      // Stamped so a future shape change can migrate rather than have zustand
      // silently discard someone's in-progress bracket. v0 (unversioned) has
      // the same shape, so it passes through untouched.
      version: 1,
      migrate: (persisted) => persisted as TournamentState,
    },
  ),
);
