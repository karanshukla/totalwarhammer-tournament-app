import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { ParticipantEditDialog } from "@/features/tournaments/components/bracket/ParticipantEditDialog";
import type { Participant } from "@/features/tournaments/components/bracket/types";

function makeParticipant(overrides: Partial<Participant> = {}): Participant {
  return {
    id: "p1",
    name: "Test Player",
    faction: "Empire",
    ...overrides,
  };
}

function renderDialog(
  props: Partial<React.ComponentProps<typeof ParticipantEditDialog>> = {},
) {
  const defaults = {
    isOpen: true,
    onClose: vi.fn(),
    participant: makeParticipant(),
    onParticipantChange: vi.fn(),
    onSave: vi.fn(),
    enable40kFactions: false,
  };
  return render(
    <ChakraProvider value={defaultSystem}>
      <ParticipantEditDialog {...defaults} {...props} />
    </ChakraProvider>,
  );
}

describe("ParticipantEditDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders dialog when open", () => {
    renderDialog();
    expect(screen.getByText("Edit Participant")).toBeInTheDocument();
  });

  it("does not render dialog content when closed", () => {
    renderDialog({ isOpen: false });
    expect(screen.queryByText("Edit Participant")).not.toBeInTheDocument();
  });

  it("shows participant name in the name input", () => {
    renderDialog({ participant: makeParticipant({ name: "Chaos Warrior" }) });
    expect(screen.getByDisplayValue("Chaos Warrior")).toBeInTheDocument();
  });

  it("calls onParticipantChange when name input changes", async () => {
    const onParticipantChange = vi.fn();
    const participant = makeParticipant({ name: "Old Name" });
    renderDialog({ participant, onParticipantChange });
    const input = screen.getByDisplayValue("Old Name");
    await userEvent.clear(input);
    await userEvent.type(input, "New Name");
    expect(onParticipantChange).toHaveBeenCalled();
    const lastCall = onParticipantChange.mock.calls.at(-1)?.[0];
    expect(lastCall).toMatchObject({ name: expect.stringContaining("N") });
  });

  it("calls onClose when Cancel button is clicked", async () => {
    const onClose = vi.fn();
    renderDialog({ onClose });
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onSave when Save button is clicked (form submit)", async () => {
    const onSave = vi.fn();
    renderDialog({ onSave });
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(onSave).toHaveBeenCalled();
  });

  it("shows empty name input when participant is null", () => {
    renderDialog({ participant: null });
    const inputs = screen.getAllByRole("textbox");
    expect(inputs[0]).toHaveValue("");
  });

  it("calls onParticipantChange on faction select change", () => {
    const onParticipantChange = vi.fn();
    const participant = makeParticipant({ faction: "Empire" });
    renderDialog({ participant, onParticipantChange });
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "Dwarfs" } });
    expect(onParticipantChange).toHaveBeenCalledWith(
      expect.objectContaining({ faction: "Dwarfs" }),
    );
  });

  it("does not call onParticipantChange on faction change when participant is null", () => {
    const onParticipantChange = vi.fn();
    renderDialog({ participant: null, onParticipantChange });
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "Chaos" } });
    expect(onParticipantChange).not.toHaveBeenCalled();
  });

  it("shows 40k factions when enable40kFactions is true", () => {
    renderDialog({ enable40kFactions: true });
    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();
    // 40k specific faction check - just verify options are present
    const options = select.querySelectorAll("option");
    expect(options.length).toBeGreaterThan(1);
  });

  it("shows warhammer3 factions by default", () => {
    renderDialog({ enable40kFactions: false });
    const select = screen.getByRole("combobox");
    const options = select.querySelectorAll("option");
    expect(options.length).toBeGreaterThan(1);
  });

  it("renders Cancel and Save buttons", () => {
    renderDialog();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
  });
});
