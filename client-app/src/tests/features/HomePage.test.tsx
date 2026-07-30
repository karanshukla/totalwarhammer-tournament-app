import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import HomePage from "@/features/home/components/HomePage";
import { MemoryRouter } from "react-router";

vi.mock("@/core/api/httpClient", () => ({
  httpClient: {
    get: vi.fn().mockResolvedValue({ success: true, data: [] }),
  },
}));

vi.mock("@/shared/stores/userStore", () => ({
  useUserStore: vi.fn(() => ({
    user: {
      isAuthenticated: false,
      isGuest: false,
      id: "",
      username: "",
      email: "",
    },
  })),
}));

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
        /Create custom brackets, participate in Total War Warhammer/i,
      ),
    ).toBeInTheDocument();
  });

  it("renders the tournament lookup section", () => {
    renderHomePage();
    expect(
      screen.getByText(
        /Enter a tournament code or select an ongoing tournament below/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e.g., ABC123/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /View Tournament/i }),
    ).toBeInTheDocument();
  });

  it("renders the how it works section", () => {
    renderHomePage();
    expect(
      screen.getByText(/Create a tournament or get a join code/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Register or join as a guest/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Start the tournament and record results/i),
    ).toBeInTheDocument();
  });

  it("renders within a container layout", () => {
    const { container } = renderHomePage();
    expect(
      container.querySelector("[class*='chakra-container']"),
    ).toBeInTheDocument();
  });
});
