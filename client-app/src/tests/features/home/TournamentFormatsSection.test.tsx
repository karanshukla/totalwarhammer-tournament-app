import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import TournamentFormatsSection from "@/features/home/components/TournamentFormatsSection";

function renderFormats() {
  return render(
    <ChakraProvider value={defaultSystem}>
      <TournamentFormatsSection />
    </ChakraProvider>,
  );
}

describe("TournamentFormatsSection", () => {
  it("renders the section heading", () => {
    renderFormats();
    expect(screen.getByRole("heading", { name: /Tournament formats/i })).toBeInTheDocument();
  });

  it("renders all four format names", () => {
    renderFormats();
    expect(screen.getByText("Single Elimination")).toBeInTheDocument();
    expect(screen.getByText("Double Elimination")).toBeInTheDocument();
    expect(screen.getByText("Round Robin")).toBeInTheDocument();
    expect(screen.getByText("Swiss System")).toBeInTheDocument();
  });

  it("renders format descriptions", () => {
    renderFormats();
    expect(screen.getByText(/Classic knockout format/i)).toBeInTheDocument();
    expect(screen.getByText(/Two chances to prove yourself/i)).toBeInTheDocument();
    expect(screen.getByText(/Everyone plays everyone/i)).toBeInTheDocument();
    expect(screen.getByText(/Paired by performance each round/i)).toBeInTheDocument();
  });
});
