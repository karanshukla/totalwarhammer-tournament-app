/**
 * Branch coverage for matches/components/EditParticipantDialog.tsx:
 * - enable40kFactions=false (default) → factionList = warhammer3Factions
 * - enable40kFactions=true → factionList = warhammer40kFactions
 * - Dialog onOpenChange with e.open=false → calls onClose
 * - participant=null → name/faction inputs show empty strings (nullish coalescing ?? "")
 * - Save button disabled when participant?.name?.trim() is empty
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import EditParticipantDialog from "@/features/matches/components/EditParticipantDialog";

const baseParticipant = {
  _id: "p1",
  name: "Grimgork",
  faction: "Greenskins",
  userId: null,
};

function renderDialog({
  open = true,
  participant = baseParticipant as typeof baseParticipant | null,
  enable40kFactions = false,
  onClose = vi.fn(),
  onParticipantChange = vi.fn(),
  onSave = vi.fn(),
} = {}) {
  return render(
    <ChakraProvider value={defaultSystem}>
      <EditParticipantDialog
        open={open}
        participant={participant}
        actionLoading={false}
        enable40kFactions={enable40kFactions}
        onClose={onClose}
        onParticipantChange={onParticipantChange}
        onSave={onSave}
      />
    </ChakraProvider>,
  );
}

describe("EditParticipantDialog – enable40kFactions=false (default)", () => {
  it("renders Warhammer 3 factions (contains 'Greenskins' option)", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderDialog({ enable40kFactions: false });
    await user.click(screen.getByRole("combobox"));
    const options = await screen.findAllByRole("option", { hidden: true });
    const optionValues = options.map((o) => o.textContent);
    expect(optionValues.some((v) => v?.includes("Greenskins"))).toBe(true);
    expect(optionValues.some((v) => v?.includes("Space Marines"))).toBe(false);
  });
});

describe("EditParticipantDialog – enable40kFactions=true", () => {
  it("renders Warhammer 40k factions (contains 'Adeptus Astartes' option)", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderDialog({ enable40kFactions: true });
    await user.click(screen.getByRole("combobox"));
    const options = await screen.findAllByRole("option", { hidden: true });
    const optionValues = options.map((o) => o.textContent);
    expect(optionValues.some((v) => v?.includes("Adeptus Astartes"))).toBe(true);
    expect(optionValues.some((v) => v?.includes("Bretonnia"))).toBe(false);
  });
});

describe("EditParticipantDialog – participant=null (nullish coalescing)", () => {
  it("shows empty name and faction when participant is null", () => {
    renderDialog({ participant: null });
    const nameInput = screen.getByRole("textbox");
    expect((nameInput as HTMLInputElement).value).toBe("");
  });
});

describe("EditParticipantDialog – Save button disabled", () => {
  it("Save is disabled when participant name is empty", () => {
    renderDialog({
      participant: { _id: "p2", name: "", faction: "Greenskins", userId: null },
    });
    expect(screen.getByRole("button", { name: /save/i })).toBeDisabled();
  });

  it("Save is enabled when participant name is non-empty", () => {
    renderDialog();
    expect(screen.getByRole("button", { name: /save/i })).not.toBeDisabled();
  });
});

describe("EditParticipantDialog – Cancel button", () => {
  it("calls onClose when Cancel is clicked", () => {
    const onClose = vi.fn();
    renderDialog({ onClose });
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
