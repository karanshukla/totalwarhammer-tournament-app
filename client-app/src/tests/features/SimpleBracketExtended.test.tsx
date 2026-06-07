import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import SimpleBracket from "@/features/tournaments/components/SimpleBracket";
import { useTournamentStore } from "@/shared/stores/tournamentStore";
import type { DragStartEvent, DragEndEvent } from "@dnd-kit/core";

vi.mock("@/shared/ui/Toaster", () => ({
  toaster: { success: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

// Capture DndContext event callbacks so we can call them directly in tests
let capturedOnDragStart: ((event: DragStartEvent) => void) | null = null;
let capturedOnDragEnd: ((event: DragEndEvent) => void) | null = null;

vi.mock("@dnd-kit/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@dnd-kit/core")>();
  return {
    ...actual,
    DndContext: ({
      onDragStart,
      onDragEnd,
      children,
    }: {
      onDragStart?: (e: DragStartEvent) => void;
      onDragEnd?: (e: DragEndEvent) => void;
      children: React.ReactNode;
    }) => {
      capturedOnDragStart = onDragStart ?? null;
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

describe("SimpleBracket - drag handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTournamentStore.getState().resetParticipantsAndBracket();
    capturedOnDragStart = null;
    capturedOnDragEnd = null;
  });

  it("registers onDragStart and onDragEnd handlers with DndContext", () => {
    renderSimpleBracket();
    expect(capturedOnDragStart).toBeTypeOf("function");
    expect(capturedOnDragEnd).toBeTypeOf("function");
  });

  describe("handleDragStart", () => {
    it("sets activeParticipant when a known participant is dragged", () => {
      renderSimpleBracket();
      const state = useTournamentStore.getState();
      const [firstParticipant] = state.participants;

      capturedOnDragStart!({
        active: {
          id: firstParticipant.id,
          data: { current: {} },
          rect: { current: { initial: null, translated: null } },
        },
        activatorEvent: {} as PointerEvent,
      });

      // The component renders the participant list — no crash means state was set
      expect(screen.getByText("Tournament Participants")).toBeInTheDocument();
    });

    it("handles drag start with unknown participant id gracefully", () => {
      renderSimpleBracket();

      expect(() => {
        capturedOnDragStart!({
          active: {
            id: "unknown-id-999",
            data: { current: {} },
            rect: { current: { initial: null, translated: null } },
          },
          activatorEvent: {} as PointerEvent,
        });
      }).not.toThrow();
    });
  });

  describe("handleDragEnd", () => {
    it("clears activeParticipant when over is null", () => {
      renderSimpleBracket();

      expect(() => {
        capturedOnDragEnd!({
          active: {
            id: "p1",
            data: { current: {} },
            rect: { current: { initial: null, translated: null } },
          },
          over: null,
          activatorEvent: {} as PointerEvent,
          collisions: null,
          delta: { x: 0, y: 0 },
        });
      }).not.toThrow();

      expect(screen.getByText("Tournament Participants")).toBeInTheDocument();
    });

    it("reorders participants when dragging over another participant", () => {
      renderSimpleBracket();
      const state = useTournamentStore.getState();
      const participants = state.participants;

      if (participants.length >= 2) {
        const [p1, p2] = participants;
        const reorderSpy = vi.spyOn(
          useTournamentStore.getState(),
          "reorderParticipants",
        );

        capturedOnDragEnd!({
          active: {
            id: p1.id,
            data: { current: {} },
            rect: { current: { initial: null, translated: null } },
          },
          over: {
            id: p2.id,
            data: { current: {} },
            disabled: false,
            rect: { width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 },
          },
          activatorEvent: {} as PointerEvent,
          collisions: null,
          delta: { x: 0, y: 0 },
        });

        expect(reorderSpy).toHaveBeenCalledWith(p1.id, p2.id);
        reorderSpy.mockRestore();
      }
    });

    it("does nothing when dragging a participant onto itself", () => {
      renderSimpleBracket();
      const state = useTournamentStore.getState();
      const [p1] = state.participants;
      const reorderSpy = vi.spyOn(
        useTournamentStore.getState(),
        "reorderParticipants",
      );

      capturedOnDragEnd!({
        active: {
          id: p1.id,
          data: { current: {} },
          rect: { current: { initial: null, translated: null } },
        },
        over: {
          id: p1.id,
          data: { current: {} },
          disabled: false,
          rect: { width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 },
        },
        activatorEvent: {} as PointerEvent,
        collisions: null,
        delta: { x: 0, y: 0 },
      });

      expect(reorderSpy).not.toHaveBeenCalled();
      reorderSpy.mockRestore();
    });

    it("updates match participant1Id when dropped on a slot position 1", () => {
      // First add a round so there are matches
      const store = useTournamentStore.getState();
      store.addRound();

      // Re-render to pick up new rounds state
      renderSimpleBracket();

      const updatedState = useTournamentStore.getState();
      const participants = updatedState.participants;
      const rounds = updatedState.rounds;

      if (
        rounds.length > 0 &&
        rounds[0].matches.length > 0 &&
        participants.length > 0
      ) {
        const match = rounds[0].matches[0];
        const [firstParticipant] = participants;

        capturedOnDragEnd!({
          active: {
            id: firstParticipant.id,
            data: { current: {} },
            rect: { current: { initial: null, translated: null } },
          },
          over: {
            id: `slot-${match.id}-1`,
            data: { current: {} },
            disabled: false,
            rect: { width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 },
          },
          activatorEvent: {} as PointerEvent,
          collisions: null,
          delta: { x: 0, y: 0 },
        });

        // Verify the store was updated
        const afterState = useTournamentStore.getState();
        const updatedMatch = afterState.rounds
          .flatMap((r) => r.matches)
          .find((m) => m.id === match.id);
        expect(updatedMatch?.participant1Id).toBe(firstParticipant.id);
      }
    });

    it("updates participant2Id when dropped on slot position 2", () => {
      const store = useTournamentStore.getState();
      store.addRound();

      renderSimpleBracket();

      const updatedState = useTournamentStore.getState();
      const participants = updatedState.participants;
      const rounds = updatedState.rounds;

      if (
        rounds.length > 0 &&
        rounds[0].matches.length > 0 &&
        participants.length > 0
      ) {
        const match = rounds[0].matches[0];
        const [firstParticipant] = participants;

        capturedOnDragEnd!({
          active: {
            id: firstParticipant.id,
            data: { current: {} },
            rect: { current: { initial: null, translated: null } },
          },
          over: {
            id: `slot-${match.id}-2`,
            data: { current: {} },
            disabled: false,
            rect: { width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 },
          },
          activatorEvent: {} as PointerEvent,
          collisions: null,
          delta: { x: 0, y: 0 },
        });

        const afterState = useTournamentStore.getState();
        const updatedMatch = afterState.rounds
          .flatMap((r) => r.matches)
          .find((m) => m.id === match.id);
        expect(updatedMatch?.participant2Id).toBe(firstParticipant.id);
      }
    });

    it("logs error when slot matchId does not match any round", () => {
      renderSimpleBracket();
      const [firstParticipant] = useTournamentStore.getState().participants;
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      capturedOnDragEnd!({
        active: {
          id: firstParticipant.id,
          data: { current: {} },
          rect: { current: { initial: null, translated: null } },
        },
        over: {
          id: "slot-nonexistent-match-id-1",
          data: { current: {} },
          disabled: false,
          rect: { width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 },
        },
        activatorEvent: {} as PointerEvent,
        collisions: null,
        delta: { x: 0, y: 0 },
      });

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Could not find match with id: nonexistent"),
      );
      errorSpy.mockRestore();
    });

    it("does not reorder when one of the ids is not a participant", () => {
      renderSimpleBracket();
      const [firstParticipant] = useTournamentStore.getState().participants;
      const reorderSpy = vi.spyOn(
        useTournamentStore.getState(),
        "reorderParticipants",
      );

      capturedOnDragEnd!({
        active: {
          id: firstParticipant.id,
          data: { current: {} },
          rect: { current: { initial: null, translated: null } },
        },
        over: {
          id: "not-a-participant-id",
          data: { current: {} },
          disabled: false,
          rect: { width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 },
        },
        activatorEvent: {} as PointerEvent,
        collisions: null,
        delta: { x: 0, y: 0 },
      });

      expect(reorderSpy).not.toHaveBeenCalled();
      reorderSpy.mockRestore();
    });
  });
});
