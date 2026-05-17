import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { MemoryRouter } from "react-router-dom";
import HeroSection from "@/features/home/components/HeroSection";

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
  it("renders the app title", () => {
    renderHero();
    expect(
      screen.getByRole("heading", { name: /TW Tournament App/i }),
    ).toBeInTheDocument();
  });

  it("renders the Total War: Warhammer badge", () => {
    renderHero();
    expect(screen.getByText(/Total War: Warhammer/i)).toBeInTheDocument();
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

  it("renders the Create Account button", () => {
    renderHero();
    expect(
      screen.getByRole("button", { name: /Create Account/i }),
    ).toBeInTheDocument();
  });

  it("View Ongoing Tournaments link points to /tournaments", () => {
    renderHero();
    const link = screen.getByRole("link", {
      name: /View Ongoing Tournaments/i,
    });
    expect(link).toHaveAttribute("href", "/tournaments");
  });
});
