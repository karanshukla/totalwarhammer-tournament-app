/**
 * Smoke test for shared/ui/Prose.tsx:
 * Prose is a styled chakra component with no conditional branches.
 * Tests verify it renders with children and size variants.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { Prose } from "@/shared/ui/Prose";

function renderProse(size?: "md" | "lg") {
  return render(
    <ChakraProvider value={defaultSystem}>
      <Prose size={size}>
        <p>Hello Prose</p>
      </Prose>
    </ChakraProvider>,
  );
}

describe("Prose – renders children", () => {
  it("renders with default size (md) and shows children", () => {
    renderProse();
    expect(screen.getByText("Hello Prose")).toBeInTheDocument();
  });

  it("renders with size='lg' and shows children", () => {
    renderProse("lg");
    expect(screen.getByText("Hello Prose")).toBeInTheDocument();
  });
});
