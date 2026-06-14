import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";

vi.mock("@dnd-kit/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@dnd-kit/core")>();
  return {
    ...actual,
    useDroppable: vi.fn(),
  };
});

import { useDroppable } from "@dnd-kit/core";
import { MatchParticipantSlot } from "@/features/tournaments/components/bracket/MatchParticipantSlot";
import type { Participant } from "@/features/tournaments/components/bracket/types";

const mockUseDroppable = vi.mocked(useDroppable);

const participants: Participant[] = [
  { id: "p1", name: "Alice", faction: "Empire" },
  { id: "p2", name: "Bob", faction: "Chaos" },
];

function makeDroppableReturn(isOver = false) {
  return {
    setNodeRef: vi.fn(),
    isOver,
    over: null,
    active: null,
    node: { current: null },
    rect: { current: null },
    disabled: false,
  } as unknown as ReturnType<typeof useDroppable>;
}

function renderSlot(
  props: Partial<React.ComponentProps<typeof MatchParticipantSlot>> = {},
) {
  const defaults = {
    matchId: "m1",
    position: 1 as const,
    participantId: null,
    participants,
    onRemove: vi.fn(),
  };
  return render(
    <ChakraProvider value={defaultSystem}>
      <MatchParticipantSlot {...defaults} {...props} />
    </ChakraProvider>,
  );
}

describe("MatchParticipantSlot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDroppable.mockReturnValue(makeDroppableReturn(false));
  });

  it("shows 'Drop player here' when no participant is assigned", () => {
    renderSlot({ participantId: null });
    expect(screen.getByText("Drop player here")).toBeInTheDocument();
  });

  it("shows participant name and faction when a participant is assigned", () => {
    renderSlot({ participantId: "p1" });
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Empire")).toBeInTheDocument();
  });

  it("shows Remove button when participant is assigned", () => {
    renderSlot({ participantId: "p1" });
    expect(
      screen.getByRole("button", { name: /remove participant/i }),
    ).toBeInTheDocument();
  });

  it("calls onRemove when the remove button is clicked", async () => {
    const onRemove = vi.fn();
    renderSlot({ participantId: "p1", onRemove });
    await userEvent.click(
      screen.getByRole("button", { name: /remove participant/i }),
    );
    expect(onRemove).toHaveBeenCalled();
  });

  it("applies isOver=true style branches (info.border, info.subtle)", () => {
    mockUseDroppable.mockReturnValue(makeDroppableReturn(true));
    const { container } = renderSlot({ participantId: null });
    expect(container.firstChild).toBeDefined();
    expect(screen.getByText("Drop player here")).toBeInTheDocument();
  });

  it("applies isOver=true with a participant assigned", () => {
    mockUseDroppable.mockReturnValue(makeDroppableReturn(true));
    renderSlot({ participantId: "p2" });
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Chaos")).toBeInTheDocument();
  });

  it("shows 'Drop player here' when participantId does not match any participant", () => {
    renderSlot({ participantId: "nonexistent" });
    expect(screen.getByText("Drop player here")).toBeInTheDocument();
  });

  it("calls setNodeRef from useDroppable", () => {
    const setNodeRef = vi.fn();
    mockUseDroppable.mockReturnValue({
      ...makeDroppableReturn(false),
      setNodeRef,
    });
    renderSlot();
    expect(setNodeRef).toHaveBeenCalled();
  });
});
