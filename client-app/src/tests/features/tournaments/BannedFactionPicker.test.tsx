/**
 * Accessibility contract for create/BannedFactionPicker.tsx:
 * - each faction is a labelled checkbox, so it has an accessible name
 * - the checkbox toggles from the keyboard, not just from a click on the row
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";

import BannedFactionPicker from "@/features/tournaments/components/create/BannedFactionPicker";

const factions = ["Bretonnia", "Dwarfs", "Skaven"];

function renderPicker(banned: string[] = []) {
  const onChange = vi.fn();
  render(
    <ChakraProvider value={defaultSystem}>
      <BannedFactionPicker
        factions={factions}
        banned={banned}
        onChange={onChange}
      />
    </ChakraProvider>,
  );
  return onChange;
}

describe("BannedFactionPicker – accessible checkboxes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("exposes every faction as a checkbox named after the faction", () => {
    renderPicker();
    for (const faction of factions) {
      expect(
        screen.getByRole("checkbox", { name: faction }),
      ).toBeInTheDocument();
    }
  });

  it("reflects the banned list in the checked state", () => {
    renderPicker(["Dwarfs"]);
    expect(screen.getByRole("checkbox", { name: "Dwarfs" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Skaven" })).not.toBeChecked();
  });

  it("groups the checkboxes under a labelled group", () => {
    renderPicker();
    expect(
      screen.getByRole("group", { name: /banned factions/i }),
    ).toBeInTheDocument();
  });

  it("bans a faction when its checkbox is toggled with the keyboard", async () => {
    const onChange = renderPicker();
    await userEvent.tab();
    expect(screen.getByRole("checkbox", { name: "Bretonnia" })).toHaveFocus();

    await userEvent.keyboard(" ");
    expect(onChange).toHaveBeenCalledWith(["Bretonnia"]);
  });

  it("unbans a faction when an already-checked box is toggled", async () => {
    const onChange = renderPicker(["Skaven"]);
    await userEvent.click(screen.getByRole("checkbox", { name: "Skaven" }));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
