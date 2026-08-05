/**
 * Render coverage for terms/components/TermsPage.tsx (static content page)
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { MemoryRouter } from "react-router";

vi.mock("@/shared/ui/Prose", () => ({
  Prose: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import TermsPage from "@/features/terms/components/TermsPage";

describe("TermsPage", () => {
  it("renders 'Terms of Use' heading", () => {
    render(
      <MemoryRouter>
        <ChakraProvider value={defaultSystem}>
          <TermsPage />
        </ChakraProvider>
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("heading", { name: /terms of use/i }),
    ).toBeInTheDocument();
  });
});
