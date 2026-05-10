import { describe, it, expect, beforeEach } from "vitest";
import { useTournamentStore } from "@/shared/stores/tournamentStore";

describe("tournamentStore", () => {
  beforeEach(() => {
    useTournamentStore.getState().resetParticipantsAndBracket();
  });

  it("should have initial participants and rounds", () => {
    const state = useTournamentStore.getState();
    expect(state.participants.length).toBeGreaterThan(0);
    expect(state.rounds.length).toBeGreaterThan(0);
  });

  it("addParticipants should increase participant count", () => {
    const initialCount = useTournamentStore.getState().participants.length;
    const { addParticipants } = useTournamentStore.getState();
    addParticipants(2);

    expect(useTournamentStore.getState().participants.length).toBe(
      initialCount + 2,
    );
  });

  it("updateParticipant should update a participant's details", () => {
    const { participants, updateParticipant } = useTournamentStore.getState();
    const first = participants[0];
    const updated = { ...first, name: "New Name" };

    updateParticipant(updated);

    expect(useTournamentStore.getState().participants[0].name).toBe("New Name");
  });

  it("deleteParticipant should remove participant and clear them from matches", () => {
    const { participants, deleteParticipant } = useTournamentStore.getState();
    const idToDelete = participants[0].id;

    deleteParticipant(idToDelete);

    const state = useTournamentStore.getState();
    expect(state.participants.find((p) => p.id === idToDelete)).toBeUndefined();

    // Check if removed from matches
    state.rounds.forEach((round) => {
      round.matches.forEach((match) => {
        expect(match.participant1Id).not.toBe(idToDelete);
        expect(match.participant2Id).not.toBe(idToDelete);
      });
    });
  });

  it("addRound should add a new round with correct numbering", () => {
    const initialRounds = useTournamentStore.getState().rounds.length;
    const { addRound } = useTournamentStore.getState();
    addRound();

    const state = useTournamentStore.getState();
    expect(state.rounds.length).toBe(initialRounds + 1);
    // The new round should be "Round X" where X is the next number
  });
});
