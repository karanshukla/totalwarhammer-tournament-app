import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { DndContext } from "@dnd-kit/core";
import { TournamentBracket } from "@/features/tournaments/components/bracket/TournamentBracket";
import { useTournamentStore } from "@/shared/stores/tournamentStore";

function renderBracket() {
  return render(
    <ChakraProvider value={defaultSystem}>
      <DndContext>
        <TournamentBracket />
      </DndContext>
    </ChakraProvider>,
  );
}

describe("TournamentBracket - participant slot removal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTournamentStore.getState().resetParticipantsAndBracket();
  });

  it("shows 'Remove participant' button when a participant is assigned to a slot", () => {
    // Default state has participants assigned to m1 (p1, p2), etc.
    renderBracket();
    // The "×" button with aria-label "Remove participant" should appear
    const removeButtons = screen.getAllByRole("button", {
      name: /remove participant/i,
    });
    expect(removeButtons.length).toBeGreaterThan(0);
  });

  it("removes participant from position 1 when Remove participant is clicked", async () => {
    const store = useTournamentStore.getState();
    const firstMatch = store.rounds[0].matches[0];
    // Ensure participant1Id is set
    expect(firstMatch.participant1Id).not.toBeNull();

    renderBracket();

    const removeButtons = screen.getAllByRole("button", {
      name: /remove participant/i,
    });
    await userEvent.click(removeButtons[0]);

    const updatedState = useTournamentStore.getState();
    // One of the match slots should now be null
    const allMatches = updatedState.rounds.flatMap((r) => r.matches);
    const firstUpdatedMatch = allMatches.find((m) => m.id === firstMatch.id)!;
    // Either participant1Id or participant2Id was cleared
    expect(
      firstUpdatedMatch.participant1Id === null ||
        firstUpdatedMatch.participant2Id === null,
    ).toBe(true);
  });

  it("calls updateMatchParticipant with null to clear position 1", async () => {
    const store = useTournamentStore.getState();
    const firstMatch = store.rounds[0].matches[0];
    const originalP1Id = firstMatch.participant1Id;

    renderBracket();

    // The first "Remove participant" button corresponds to position 1 of match 1
    const removeButtons = screen.getAllByRole("button", {
      name: /remove participant/i,
    });
    await userEvent.click(removeButtons[0]);

    const updatedMatch = useTournamentStore
      .getState()
      .rounds[0].matches.find((m) => m.id === firstMatch.id)!;

    // The participant should have been removed (set to null)
    expect(updatedMatch.participant1Id).toBeNull();
    expect(originalP1Id).not.toBeNull(); // Confirm we started with a participant
  });

  it("calls updateMatchParticipant with null to clear position 2", async () => {
    const store = useTournamentStore.getState();
    const firstMatch = store.rounds[0].matches[0];
    const originalP2Id = firstMatch.participant2Id;

    renderBracket();

    // The second "Remove participant" button corresponds to position 2 of match 1
    const removeButtons = screen.getAllByRole("button", {
      name: /remove participant/i,
    });
    if (removeButtons.length >= 2) {
      await userEvent.click(removeButtons[1]);

      const updatedMatch = useTournamentStore
        .getState()
        .rounds[0].matches.find((m) => m.id === firstMatch.id)!;

      expect(updatedMatch.participant2Id).toBeNull();
      expect(originalP2Id).not.toBeNull();
    }
  });

  it("onRemoveParticipantFromSlot uses 'participant2Id' when position is 2", async () => {
    // Set up a match where participant2Id is set
    const store = useTournamentStore.getState();
    const rounds = store.rounds;
    const matchWithBothParticipants = rounds
      .flatMap((r) => r.matches)
      .find((m) => m.participant1Id && m.participant2Id);

    if (matchWithBothParticipants) {
      renderBracket();

      const allRemoveButtons = screen.getAllByRole("button", {
        name: /remove participant/i,
      });

      // Find a button that removes participant2 (every 2nd button for a match with both)
      // Click the second remove button
      if (allRemoveButtons.length >= 2) {
        await userEvent.click(allRemoveButtons[1]);

        const updatedState = useTournamentStore.getState();
        const updatedMatch = updatedState.rounds
          .flatMap((r) => r.matches)
          .find((m) => m.id === matchWithBothParticipants.id);

        // participant2Id should now be null
        expect(updatedMatch?.participant2Id).toBeNull();
      }
    }
  });
});
