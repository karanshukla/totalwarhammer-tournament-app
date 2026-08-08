/**
 * Branch coverage for UnauthenticatedSection.tsx:
 * - Renders "Not signed in" heading
 * - Clicking the button dispatches "auth-event" CustomEvent with detail { type: "open-drawer" }
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import UnauthenticatedSection from "@/features/account/components/UnauthenticatedSection";

function renderSection() {
  return render(
    <ChakraProvider value={defaultSystem}>
      <UnauthenticatedSection />
    </ChakraProvider>,
  );
}

describe("UnauthenticatedSection", () => {
  it("renders 'Not signed in' heading", () => {
    renderSection();
    expect(screen.getByText(/not signed in/i)).toBeInTheDocument();
  });

  it("dispatches 'auth-event' CustomEvent when Sign in button is clicked", async () => {
    renderSection();
    const handler = vi.fn();
    document.addEventListener("auth-event", handler);

    await userEvent.click(
      screen.getByRole("button", { name: /sign in \/ register/i }),
    );

    expect(handler).toHaveBeenCalledTimes(1);
    const evt = handler.mock.calls[0][0] as CustomEvent;
    expect(evt.detail).toEqual({ type: "open-drawer" });

    document.removeEventListener("auth-event", handler);
  });
});
