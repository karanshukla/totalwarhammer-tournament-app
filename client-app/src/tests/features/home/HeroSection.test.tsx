import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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

describe("HeroSection", () => {
  beforeEach(() => {
    mockUseUserStore.mockReturnValue({
      user: { isAuthenticated: false, isGuest: false },
    });
  });

  it("renders the app title", () => {
    renderHero();
    expect(
      screen.getByRole("heading", { name: /TW Tournament App/i }),
    ).toBeInTheDocument();
  });

  it("renders the 40k beta badge", () => {
    renderHero();
    expect(
      screen.getByText(/Now includes beta warhammer 40k support/i),
    ).toBeInTheDocument();
  });

  it("renders the description text", () => {
    renderHero();
    expect(
      screen.getByText(
        /Create custom brackets, participate in Total War Warhammer/i,
      ),
    ).toBeInTheDocument();
  });

  it("renders the View Ongoing Tournaments link", () => {
    renderHero();
    expect(
      screen.getByRole("link", { name: /View Ongoing Tournaments/i }),
    ).toBeInTheDocument();
  });

  it("renders the Create Account button for unauthenticated non-guest users", () => {
    renderHero();
    expect(
      screen.getByRole("button", { name: /Create Account/i }),
    ).toBeInTheDocument();
  });

  it("does not render the Create Account button for authenticated users", () => {
    mockUseUserStore.mockReturnValue({
      user: { isAuthenticated: true, isGuest: false },
    });
    renderHero();
    expect(
      screen.queryByRole("button", { name: /Create Account/i }),
    ).not.toBeInTheDocument();
  });

  it("does not render the Create Account button for guest users", () => {
    mockUseUserStore.mockReturnValue({
      user: { isAuthenticated: false, isGuest: true },
    });
    renderHero();
    expect(
      screen.queryByRole("button", { name: /Create Account/i }),
    ).not.toBeInTheDocument();
  });

  it("View Ongoing Tournaments link points to /tournaments", () => {
    renderHero();
    const link = screen.getByRole("link", {
      name: /View Ongoing Tournaments/i,
    });
    expect(link).toHaveAttribute("href", "/tournaments");
  });
});
