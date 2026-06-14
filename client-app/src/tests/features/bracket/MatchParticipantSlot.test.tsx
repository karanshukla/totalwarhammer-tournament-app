import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { useDroppable } from "@dnd-kit/core";
import { MatchParticipantSlot } from "@/features/tournaments/components/bracket/MatchParticipantSlot";
import type { Participant } from "@/features/tournaments/components/bracket/types";

vi.mock("@dnd-kit/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@dnd-kit/core")>();
  return {
    ...actual,
    useDroppable: vi.fn(),
  };
});

const mockUseDroppable = vi.mocked(useDroppable);

const participants: Participant[] = [
  { id: "p1", name: "Karl Franz", faction: "Empire" },
  { id: "p2", name: "Archaon", faction: "Warriors of Chaos" },
];

function makeDroppable(isOver: boolean) {
  return {
    setNodeRef: vi.fn(),
    isOver,
    active: null,
    over: null,
    rect: { current: { initial: null, translated: null } },
    node: { current: null },
  };
}

function renderSlot(
  overrides: Partial<{
    matchId: string;
    position: 1 | 2;
    participantId: string | null;
    participants: Participant[];
    onRemove: () => void;
    isOver: boolean;
  }> = {},
) {
  const isOver = overrides.isOver ?? false;
  mockUseDroppable.mockReturnValue(makeDroppable(isOver) as ReturnType<typeof useDroppable>);

  const props = {
    matchId: overrides.matchId ?? "match1",
    position: (overrides.position ?? 1) as 1 | 2,
    participantId: overrides.participantId ?? null,
    participants: overrides.participants ?? participants,
    onRemove: overrides.onRemove ?? vi.fn(),
  };

  return render(
    <ChakraProvider value={defaultSystem}>
      <MatchParticipantSlot {...props} />
    </ChakraProvider>,
  );
}

describe("MatchParticipantSlot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows 'Drop player here' when no participant is assigned", () => {
    renderSlot({ participantId: null });
    expect(screen.getByText(/drop player here/i)).toBeInTheDocument();
  });

  it("shows participant name and faction when a participant is assigned", () => {
    renderSlot({ participantId: "p1" });
    expect(screen.getByText("Karl Franz")).toBeInTheDocument();
    expect(screen.getByText("Empire")).toBeInTheDocument();
  });

  it("shows 'Remove participant' button when participant is assigned", () => {
    renderSlot({ participantId: "p1" });
    expect(
      screen.getByRole("button", { name: /remove participant/i }),
    ).toBeInTheDocument();
  });

  it("calls onRemove when Remove button is clicked", async () => {
    const onRemove = vi.fn();
    renderSlot({ participantId: "p1", onRemove });
    await userEvent.click(screen.getByRole("button", { name: /remove participant/i }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("calls useDroppable with the correct droppable id", () => {
    renderSlot({ matchId: "m42", position: 2 });
    expect(mockUseDroppable).toHaveBeenCalledWith({ id: "slot-m42-2" });
  });

  it("applies isOver=false styles (default border/bg)", () => {
    renderSlot({ isOver: false });
    // Component renders without errors in non-isOver state
    expect(screen.getByText(/drop player here/i)).toBeInTheDocument();
  });

  it("applies isOver=true styles (info border/bg) when dragging over", () => {
    renderSlot({ isOver: true, participantId: null });
    // Component renders without errors when isOver is true
    expect(screen.getByText(/drop player here/i)).toBeInTheDocument();
  });

  it("applies isOver=true styles when a participant slot has a participant and drag is over", () => {
    renderSlot({ isOver: true, participantId: "p2" });
    expect(screen.getByText("Archaon")).toBeInTheDocument();
  });

  it("shows empty slot text when participantId doesn't match any participant", () => {
    renderSlot({ participantId: "nonexistent" });
    expect(screen.getByText(/drop player here/i)).toBeInTheDocument();
  });

  it("renders second position slot correctly", () => {
    renderSlot({ position: 2, participantId: "p2" });
    expect(screen.getByText("Archaon")).toBeInTheDocument();
    expect(mockUseDroppable).toHaveBeenCalledWith({ id: "slot-match1-2" });
  });
});
