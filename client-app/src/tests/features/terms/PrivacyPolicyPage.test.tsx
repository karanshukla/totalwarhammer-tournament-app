/**
 * Render coverage for terms/components/PrivacyPolicyPage.tsx (static content page)
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";

vi.mock("@/shared/ui/Prose", () => ({
  Prose: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import PrivacyPolicyPage from "@/features/terms/components/PrivacyPolicyPage";

describe("PrivacyPolicyPage", () => {
  it("renders 'Privacy Policy' heading", () => {
    render(
      <ChakraProvider value={defaultSystem}>
        <PrivacyPolicyPage />
      </ChakraProvider>,
    );
    expect(screen.getByRole("heading", { name: /privacy policy/i })).toBeInTheDocument();
  });
});
