import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import SimpleBracket from "@/features/tournaments/components/SimpleBracket";
import { useTournamentStore } from "@/shared/stores/tournamentStore";

vi.mock("@/shared/ui/Toaster", () => ({
  toaster: { success: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

function renderSimpleBracket() {
  return render(
    <ChakraProvider value={defaultSystem}>
      <SimpleBracket />
    </ChakraProvider>,
  );
}

describe("SimpleBracket", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTournamentStore.getState().resetParticipantsAndBracket();
  });

  it("renders without crashing", () => {
    renderSimpleBracket();
    expect(screen.getByText("Tournament Participants")).toBeInTheDocument();
  });

  it("renders the TournamentBracket section", () => {
    renderSimpleBracket();
    expect(screen.getByText("Tournament Bracket")).toBeInTheDocument();
  });

  it("renders ParticipantList inside the DndContext", () => {
    renderSimpleBracket();
    expect(screen.getByText(/add participants/i)).toBeInTheDocument();
  });

  it("renders Add Round button from TournamentBracket", () => {
    renderSimpleBracket();
    expect(screen.getByRole("button", { name: /add round/i })).toBeInTheDocument();
  });

  it("opens edit dialog when Edit button is clicked for a participant", async () => {
    renderSimpleBracket();
    const editButtons = screen.getAllByRole("button", { name: /edit/i });
    if (editButtons.length > 0) {
      await userEvent.click(editButtons[0]);
      expect(screen.getByText("Edit Participant")).toBeInTheDocument();
    }
  });

  it("closes edit dialog when Cancel is clicked", async () => {
    renderSimpleBracket();
    const editButtons = screen.getAllByRole("button", { name: /edit/i });
    if (editButtons.length > 0) {
      await userEvent.click(editButtons[0]);
      expect(screen.getByText("Edit Participant")).toBeInTheDocument();
      const cancelBtn = screen.getByRole("button", { name: /cancel/i });
      await userEvent.click(cancelBtn);
      expect(screen.queryByText("Edit Participant")).not.toBeInTheDocument();
    }
  });

  it("saves participant edits when Save is clicked", async () => {
    renderSimpleBracket();
    const state = useTournamentStore.getState();
    const firstParticipant = state.participants[0];

    const editButtons = screen.getAllByRole("button", { name: /edit/i });
    if (editButtons.length > 0) {
      await userEvent.click(editButtons[0]);
      expect(screen.getByText("Edit Participant")).toBeInTheDocument();

      // Change the name
      const nameInput = screen.getByDisplayValue(firstParticipant.name);
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, "Updated Player");

      const saveBtn = screen.getByRole("button", { name: /save/i });
      await userEvent.click(saveBtn);

      // Dialog should close after save
      expect(screen.queryByText("Edit Participant")).not.toBeInTheDocument();
    }
  });

  it("renders add participants button", () => {
    renderSimpleBracket();
    expect(screen.getByRole("button", { name: /add participants/i })).toBeInTheDocument();
  });

  it("adds participants on button click", async () => {
    const initialCount = useTournamentStore.getState().participants.length;
    renderSimpleBracket();
    const addBtn = screen.getByRole("button", { name: /add participants/i });
    await userEvent.click(addBtn);
    const newCount = useTournamentStore.getState().participants.length;
    expect(newCount).toBe(initialCount + 1);
  });

  it("adds a round when Add Round is clicked", async () => {
    const initialRoundCount = useTournamentStore.getState().rounds.length;
    renderSimpleBracket();
    const addRoundBtn = screen.getByRole("button", { name: /add round/i });
    await userEvent.click(addRoundBtn);
    const newRoundCount = useTournamentStore.getState().rounds.length;
    expect(newRoundCount).toBe(initialRoundCount + 1);
  });
});
