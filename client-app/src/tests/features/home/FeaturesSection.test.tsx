import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import FeaturesSection from "@/features/home/components/FeaturesSection";

function renderFeatures() {
  return render(
    <ChakraProvider value={defaultSystem}>
      <FeaturesSection />
    </ChakraProvider>,
  );
}

describe("FeaturesSection", () => {
  it("renders the section heading", () => {
    renderFeatures();
    expect(screen.getByRole("heading", { name: /What you can do/i })).toBeInTheDocument();
  });

  it("renders all four feature cards", () => {
    renderFeatures();
    expect(screen.getByText("Run Tournaments")).toBeInTheDocument();
    expect(screen.getByText("Track Matches")).toBeInTheDocument();
    expect(screen.getByText("View Statistics")).toBeInTheDocument();
    expect(screen.getByText("Guest Friendly")).toBeInTheDocument();
  });

  it("renders descriptions for each feature", () => {
    renderFeatures();
    expect(screen.getByText(/Create and manage brackets/i)).toBeInTheDocument();
    expect(screen.getByText(/Record results, advance rounds/i)).toBeInTheDocument();
    expect(screen.getByText(/Explore win rates/i)).toBeInTheDocument();
    expect(screen.getByText(/No account required/i)).toBeInTheDocument();
  });
});
