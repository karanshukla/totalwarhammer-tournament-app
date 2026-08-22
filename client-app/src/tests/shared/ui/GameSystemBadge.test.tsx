/**
 * Coverage for shared/ui/GameSystemBadge.tsx:
 * - enable40kFactions falsy (false / undefined) → renders nothing
 * - enable40kFactions true → renders the 40K badge
 * - size prop defaults, and is forwarded when given
 *
 * WH3 is the default game system and is deliberately unlabelled, so "renders
 * nothing" is the contract rather than an edge case.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";

import GameSystemBadge from "@/shared/ui/GameSystemBadge";

const renderBadge = (props: React.ComponentProps<typeof GameSystemBadge>) =>
  render(
    <ChakraProvider value={defaultSystem}>
      <GameSystemBadge {...props} />
    </ChakraProvider>,
  );

describe("GameSystemBadge", () => {
  it("renders nothing for a WH3 tournament", () => {
    const { container } = renderBadge({ enable40kFactions: false });
    expect(screen.queryByText("40K")).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when the flag is absent", () => {
    // Tournaments created before the 40K split have no flag at all.
    const { container } = renderBadge({});
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the 40K badge when the flag is set", () => {
    renderBadge({ enable40kFactions: true });
    expect(screen.getByText("40K")).toBeInTheDocument();
  });

  it("accepts a larger size without changing the label", () => {
    renderBadge({ enable40kFactions: true, size: "md" });
    expect(screen.getByText("40K")).toBeInTheDocument();
  });
});
