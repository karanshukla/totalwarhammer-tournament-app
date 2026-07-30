import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { MemoryRouter } from "react-router";
import HowItWorksSection from "@/features/home/components/HowItWorksSection";

function renderSection() {
  return render(
    <ChakraProvider value={defaultSystem}>
      <MemoryRouter>
        <HowItWorksSection />
      </MemoryRouter>
    </ChakraProvider>,
  );
}

describe("HowItWorksSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("dispatches auth-event when Create Account button is clicked", async () => {
    const dispatchSpy = vi.spyOn(document, "dispatchEvent");
    renderSection();

    const btn = screen.getByRole("button", { name: /create account/i });
    await userEvent.click(btn);

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: "auth-event" }),
    );
    dispatchSpy.mockRestore();
  });

  it("dispatches auth-event with open-drawer detail", async () => {
    let capturedEvent: CustomEvent | null = null;
    const handler = (e: Event) => {
      capturedEvent = e as CustomEvent;
    };
    document.addEventListener("auth-event", handler);
    renderSection();

    await userEvent.click(
      screen.getByRole("button", { name: /create account/i }),
    );

    expect(capturedEvent).not.toBeNull();
    expect((capturedEvent as unknown as CustomEvent).detail).toEqual({
      type: "open-drawer",
    });
    document.removeEventListener("auth-event", handler);
  });

  it("renders the section heading", () => {
    renderSection();
    expect(screen.getByText(/How it works/i)).toBeInTheDocument();
  });

  it("renders all five steps", () => {
    renderSection();
    expect(
      screen.getByText(/Register or join as a guest/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Create a tournament or get a join code/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Invite participants and fill the bracket/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Start the tournament and record results/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Advance rounds until a winner is crowned/i),
    ).toBeInTheDocument();
  });

  it("renders step numbers 1 through 5", () => {
    renderSection();
    ["1", "2", "3", "4", "5"].forEach((n) => {
      expect(screen.getByText(n)).toBeInTheDocument();
    });
  });

  it("renders footer CTA links", () => {
    renderSection();
    expect(
      screen.getByRole("link", { name: /View Ongoing Tournaments/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Create Account/i }),
    ).toBeInTheDocument();
  });

  it("View Ongoing Tournaments link points to /tournaments#currentTournaments", () => {
    renderSection();
    const link = screen.getByRole("link", {
      name: /View Ongoing Tournaments/i,
    });
    expect(link).toHaveAttribute("href", "/tournaments#currentTournaments");
  });
});
