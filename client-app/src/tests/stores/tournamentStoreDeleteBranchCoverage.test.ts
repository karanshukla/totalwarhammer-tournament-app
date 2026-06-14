/**
 * Branch coverage for tournamentStore.ts deleteParticipant (lines 237-241):
 * - Line 237: `match.participant2Id === participantId ? null : match.participant2Id`
 *   true branch — when the deleted participant IS in participant2Id slot
 * - Line 241: `match.winnerId === participantId ? null : match.winnerId`
 *   true branch — when the deleted participant IS the winner
 *
 * Existing tests only delete participant1Id, never participant2Id or winnerId.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { useTournamentStore } from "@/shared/stores/tournamentStore";

describe("tournamentStore – deleteParticipant branch coverage (lines 237-241)", () => {
  beforeEach(() => {
    useTournamentStore.getState().resetParticipantsAndBracket();
  });

  it("clears participant2Id when that slot holds the deleted participant (line 237 true branch)", () => {
    const store = useTournamentStore.getState();
    store.addRound();

    const state = useTournamentStore.getState();
    const [p1, p2] = state.participants;
    const match = state.rounds[0]?.matches[0];

    if (!match || !p1 || !p2) return;

    // Place p2 into the participant2Id slot
    store.updateMatchParticipant(match.id, "participant2Id", p2.id);

    // Confirm p2 is in participant2Id slot
    expect(
      useTournamentStore.getState().rounds[0].matches[0].participant2Id,
    ).toBe(p2.id);

    // Delete p2 — this should clear participant2Id (line 237 true branch: null)
    store.deleteParticipant(p2.id);

    const updatedMatch = useTournamentStore.getState().rounds[0].matches[0];
    expect(updatedMatch.participant2Id).toBeNull();
  });

  it("clears winnerId when the deleted participant was the winner (line 241 true branch)", () => {
    const store = useTournamentStore.getState();
    store.addRound();

    const state = useTournamentStore.getState();
    const [p1] = state.participants;
    const match = state.rounds[0]?.matches[0];

    if (!match || !p1) return;

    // Set p1 as participant and winner (winnerId uses the same dynamic setter)
    store.updateMatchParticipant(match.id, "participant1Id", p1.id);
    store.updateMatchParticipant(match.id, "winnerId" as "participant1Id", p1.id);

    // Confirm winnerId is set
    const matchWithWinner = useTournamentStore.getState().rounds[0].matches[0];
    expect(matchWithWinner.winnerId).toBe(p1.id);

    // Delete the winner — should clear winnerId (line 241 true branch: null)
    store.deleteParticipant(p1.id);

    const updatedMatch = useTournamentStore.getState().rounds[0].matches[0];
    expect(updatedMatch.winnerId).toBeNull();
  });

  it("keeps participant1Id of other participants when a different participant is deleted (line 233 false branch)", () => {
    const store = useTournamentStore.getState();
    store.addRound();

    const state = useTournamentStore.getState();
    const [p1, p2] = state.participants;
    const match = state.rounds[0]?.matches[0];

    if (!match || !p1 || !p2) return;

    // Place p1 and p2 into slots
    store.updateMatchParticipant(match.id, "participant1Id", p1.id);
    store.updateMatchParticipant(match.id, "participant2Id", p2.id);

    // Delete p2 — p1 should remain in participant1Id
    store.deleteParticipant(p2.id);

    const updatedMatch = useTournamentStore.getState().rounds[0].matches[0];
    expect(updatedMatch.participant1Id).toBe(p1.id);
    expect(updatedMatch.participant2Id).toBeNull();
  });
});
