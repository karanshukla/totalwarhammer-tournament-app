/**
 * Branch coverage for bracket/MatchParticipantSlot.tsx:
 * - participantId=null → shows "Drop player here" (null branch, line 25-27)
 * - participantId set and participant found → shows name + faction + Remove button (truthy branch)
 * - onRemove callback fires when Remove button is clicked
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";

vi.mock("@dnd-kit/core", () => ({
  useDroppable: () => ({ setNodeRef: vi.fn(), isOver: false }),
}));

import { MatchParticipantSlot } from "@/features/tournaments/components/bracket/MatchParticipantSlot";

const participants = [
  { id: "p1", name: "Grimgork", faction: "Orks" },
  { id: "p2", name: "Sigmar", faction: "Empire" },
];

function renderSlot(participantId: string | null, onRemove = vi.fn()) {
  return render(
    <ChakraProvider value={defaultSystem}>
      <MatchParticipantSlot
        matchId="m1"
        position={1}
        participantId={participantId}
        participants={participants}
        onRemove={onRemove}
      />
    </ChakraProvider>,
  );
}

describe("MatchParticipantSlot – empty slot (participantId=null)", () => {
  it("shows 'Drop player here' when no participant assigned", () => {
    renderSlot(null);
    expect(screen.getByText(/drop player here/i)).toBeInTheDocument();
  });
});

describe("MatchParticipantSlot – filled slot (participant found)", () => {
  it("shows participant name and faction", () => {
    renderSlot("p1");
    expect(screen.getByText("Grimgork")).toBeInTheDocument();
    expect(screen.getByText("Orks")).toBeInTheDocument();
  });

  it("calls onRemove when the Remove button is clicked", async () => {
    const onRemove = vi.fn();
    renderSlot("p2", onRemove);
    await userEvent.click(screen.getByRole("button", { name: /remove participant/i }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
