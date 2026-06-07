/**
 * Extended coverage for HeroSection.
 * Covers line 49: Create Account button onClick dispatches auth-event.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { MemoryRouter } from "react-router-dom";
import HeroSection from "@/features/home/components/HeroSection";

const mockUseUserStore = vi.fn();

vi.mock("@/shared/stores/userStore", () => ({
  useUserStore: () => mockUseUserStore(),
}));

function renderHero() {
  return render(
    <ChakraProvider value={defaultSystem}>
      <MemoryRouter>
        <HeroSection />
      </MemoryRouter>
    </ChakraProvider>,
  );
}

describe("HeroSection – Create Account button onClick", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseUserStore.mockReturnValue({
      user: { isAuthenticated: false, isGuest: false },
    });
  });

  it("dispatches auth-event when Create Account is clicked", async () => {
    const dispatchSpy = vi.spyOn(document, "dispatchEvent");
    renderHero();

    const btn = screen.getByRole("button", { name: /create account/i });
    await userEvent.click(btn);

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: "auth-event" }),
    );
    dispatchSpy.mockRestore();
  });

  it("dispatches event with open-drawer detail", async () => {
    let capturedEvent: CustomEvent | null = null;
    const handler = (e: Event) => {
      capturedEvent = e as CustomEvent;
    };
    document.addEventListener("auth-event", handler);

    renderHero();
    await userEvent.click(
      screen.getByRole("button", { name: /create account/i }),
    );

    expect(capturedEvent).not.toBeNull();
    expect((capturedEvent as unknown as CustomEvent).detail).toEqual({
      type: "open-drawer",
    });

    document.removeEventListener("auth-event", handler);
  });
});
