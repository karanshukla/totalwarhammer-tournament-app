/**
 * Smoke test for shared/ui/Provider.tsx:
 * Provider wraps ChakraProvider + ColorModeProvider with no conditional branches.
 * Test verifies it renders children.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";

vi.mock("next-themes", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useTheme: () => ({ theme: "light", setTheme: vi.fn(), resolvedTheme: "light" }),
}));

import { Provider } from "@/shared/ui/Provider";

describe("Provider – renders children", () => {
  it("renders child content within the provider", () => {
    render(
      <Provider>
        <div data-testid="child">Hello Provider</div>
      </Provider>,
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByText("Hello Provider")).toBeInTheDocument();
  });
});
