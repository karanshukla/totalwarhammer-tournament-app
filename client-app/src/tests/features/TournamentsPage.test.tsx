import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { BrowserRouter } from "react-router";
import TournamentsPage from "@/features/tournaments/components/TournamentsPage";

vi.mock("@/core/api/httpClient", () => ({
  httpClient: {
    get: vi.fn(),
  },
}));

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <BrowserRouter>
      <ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>
    </BrowserRouter>,
  );
}

describe("TournamentsPage", () => {
  it("renders the page title", () => {
    renderWithProviders(<TournamentsPage />);
    expect(screen.getByText("Tournaments")).toBeInTheDocument();
  });

  it("renders the tournament code input", () => {
    renderWithProviders(<TournamentsPage />);
    expect(screen.getByPlaceholderText(/abc123/i)).toBeInTheDocument();
  });

  it("renders the find button", () => {
    renderWithProviders(<TournamentsPage />);
    expect(screen.getByRole("button", { name: /find/i })).toBeInTheDocument();
  });

  it("renders all navigation tabs", () => {
    renderWithProviders(<TournamentsPage />);
    expect(screen.getByText("Create a Simple Bracket")).toBeInTheDocument();
    expect(screen.getByText("Create a Tournament")).toBeInTheDocument();
    expect(screen.getByText("View Ongoing Tournaments")).toBeInTheDocument();
    expect(screen.getByText("View Past Tournaments")).toBeInTheDocument();
  });

  it("displays SimpleBracket by default", () => {
    renderWithProviders(<TournamentsPage />);
    // The default tab should be brackets
    expect(screen.getByText(/create a simple bracket/i)).toBeInTheDocument();
  });
});
