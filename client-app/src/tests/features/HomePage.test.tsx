import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import HomePage from "@/features/home/components/HomePage";
import { MemoryRouter } from "react-router-dom";

function renderHomePage() {
  return render(
    <ChakraProvider value={defaultSystem}>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </ChakraProvider>,
  );
}

describe("HomePage", () => {
  it("renders the hero section with main description", () => {
    renderHomePage();
    expect(
      screen.getByText(
        /Create custom brackets, participate in Total War Warhammer 3/i,
      ),
    ).toBeInTheDocument();
  });

  it("renders the tournament lookup section", () => {
    renderHomePage();
    expect(
      screen.getByText(/Enter a tournament code to view an ongoing tournament/i),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/e.g., ABC123/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /View Tournament/i }),
    ).toBeInTheDocument();
  });

  it("renders the account info section", () => {
    renderHomePage();
    expect(screen.getByText(/Create a tournament:/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Participate in a tournament:/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Guest accounts are limited/i)).toBeInTheDocument();
  });

  it("renders within a container layout", () => {
    const { container } = renderHomePage();
    expect(
      container.querySelector("[class*='chakra-container']"),
    ).toBeInTheDocument();
  });
});
