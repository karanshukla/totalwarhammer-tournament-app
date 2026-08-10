/**
 * Keyboard contract for shared/ui/SelectableCard.tsx: the card is a div with
 * role="button", so Enter/Space activation is wired up inside the component
 * rather than at each call site.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";

import { SelectableCard } from "@/shared/ui/SelectableCard";

function renderCard(onKeyDown?: (event: React.KeyboardEvent) => void) {
  const onClick = vi.fn();
  render(
    <ChakraProvider value={defaultSystem}>
      <SelectableCard onClick={onClick} onKeyDown={onKeyDown}>
        Bracket
      </SelectableCard>
    </ChakraProvider>,
  );
  return onClick;
}

describe("SelectableCard – keyboard activation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("is reachable by tab as a button", async () => {
    renderCard();
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Bracket" })).toHaveFocus();
  });

  it("activates on Enter", async () => {
    const onClick = renderCard();
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("activates on Space", async () => {
    const onClick = renderCard();
    await userEvent.tab();
    await userEvent.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("ignores unrelated keys", async () => {
    const onClick = renderCard();
    await userEvent.tab();
    await userEvent.keyboard("{Escape}");
    expect(onClick).not.toHaveBeenCalled();
  });

  it("lets a caller's onKeyDown pre-empt the default activation", async () => {
    const onKeyDown = vi.fn((event: React.KeyboardEvent) =>
      event.preventDefault(),
    );
    const onClick = renderCard(onKeyDown);
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    expect(onKeyDown).toHaveBeenCalled();
    expect(onClick).not.toHaveBeenCalled();
  });
});
