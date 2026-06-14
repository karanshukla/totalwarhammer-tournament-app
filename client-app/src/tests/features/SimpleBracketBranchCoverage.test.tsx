/**
 * Branch coverage for SimpleBracket.tsx:
 * - Line 84: `else if (positionString === "2")` false branch — slot position is
 *   neither "1" nor "2" (e.g. "slot-matchId-x"). The code silently skips the update.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import SimpleBracket from "@/features/tournaments/components/SimpleBracket";
import { useTournamentStore } from "@/shared/stores/tournamentStore";
import type { DragEndEvent } from "@dnd-kit/core";

vi.mock("@/shared/ui/Toaster", () => ({
  toaster: { success: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

let capturedOnDragEnd: ((event: DragEndEvent) => void) | null = null;

vi.mock("@dnd-kit/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@dnd-kit/core")>();
  return {
    ...actual,
    DndContext: ({
      onDragEnd,
      children,
    }: {
      onDragEnd?: (e: DragEndEvent) => void;
      children: React.ReactNode;
    }) => {
      capturedOnDragEnd = onDragEnd ?? null;
      return <>{children}</>;
    },
  };
});

function renderSimpleBracket() {
  return render(
    <ChakraProvider value={defaultSystem}>
      <SimpleBracket />
    </ChakraProvider>,
  );
}

describe("SimpleBracket – invalid slot position branch (line 84)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTournamentStore.getState().resetParticipantsAndBracket();
    capturedOnDragEnd = null;
  });

  it("does not update match when slot position is not '1' or '2'", () => {
    const store = useTournamentStore.getState();
    store.addRound();
    renderSimpleBracket();

    const state = useTournamentStore.getState();
    const [firstParticipant] = state.participants;
    const match = state.rounds[0]?.matches[0];

    if (!match || !firstParticipant) return;

    const updateSpy = vi.spyOn(useTournamentStore.getState(), "updateMatchParticipant");

    capturedOnDragEnd!({
      active: {
        id: firstParticipant.id,
        data: { current: {} },
        rect: { current: { initial: null, translated: null } },
      },
      over: {
        // Position "x" is neither "1" nor "2" → hits the false branch of else if
        id: `slot-${match.id}-x`,
        data: { current: {} },
        disabled: false,
        rect: { width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 },
      },
      activatorEvent: {} as PointerEvent,
      collisions: null,
      delta: { x: 0, y: 0 },
    });

    // Neither participant1Id nor participant2Id should be updated
    expect(updateSpy).not.toHaveBeenCalled();
    updateSpy.mockRestore();
    expect(screen.getByText("Tournament Participants")).toBeInTheDocument();
  });

  it("handles slot position 3 (neither 1 nor 2) gracefully", () => {
    const store = useTournamentStore.getState();
    store.addRound();
    renderSimpleBracket();

    const state = useTournamentStore.getState();
    const [firstParticipant] = state.participants;
    const match = state.rounds[0]?.matches[0];

    if (!match || !firstParticipant) return;

    expect(() => {
      capturedOnDragEnd!({
        active: {
          id: firstParticipant.id,
          data: { current: {} },
          rect: { current: { initial: null, translated: null } },
        },
        over: {
          id: `slot-${match.id}-3`,
          data: { current: {} },
          disabled: false,
          rect: { width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 },
        },
        activatorEvent: {} as PointerEvent,
        collisions: null,
        delta: { x: 0, y: 0 },
      });
    }).not.toThrow();
  });
});
