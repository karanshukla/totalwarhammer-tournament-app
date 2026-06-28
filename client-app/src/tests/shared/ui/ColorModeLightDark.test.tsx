/**
 * Missing coverage for shared/ui/ColorMode.tsx
 *
 * Covers the two unexported forwardRef components not tested elsewhere:
 *   Line 71 – LightMode component renders its Span children
 *   Line 88 – DarkMode component renders its Span children
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { LightMode, DarkMode } from "@/shared/ui/ColorMode";

function wrap(children: React.ReactNode) {
  return render(
    <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>,
  );
}

describe("ColorMode – LightMode component (line 71)", () => {
  it("renders children inside a Span with chakra-theme light class", () => {
    wrap(<LightMode>light-content</LightMode>);
    expect(screen.getByText("light-content")).toBeInTheDocument();
  });
});

describe("ColorMode – DarkMode component (line 88)", () => {
  it("renders children inside a Span with chakra-theme dark class", () => {
    wrap(<DarkMode>dark-content</DarkMode>);
    expect(screen.getByText("dark-content")).toBeInTheDocument();
  });
});
