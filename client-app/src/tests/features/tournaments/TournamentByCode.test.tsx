/**
 * Branch coverage for TournamentByCode.tsx:
 * - notFound=false, !resolvedId → shows Spinner (loading state)
 * - notFound=true → shows "Tournament Not Found" message
 * - resolvedId set → renders TournamentViewPage with the id
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const { mockGet } = vi.hoisted(() => ({
  mockGet: vi.fn(),
}));

vi.mock("@/core/api/httpClient", () => ({
  httpClient: { get: mockGet },
}));

vi.mock(
  "@/features/tournaments/components/TournamentViewPage",
  () => ({
    default: ({ id }: { id: string }) => <div data-testid="view-page">id:{id}</div>,
  }),
);

import TournamentByCode from "@/features/tournaments/components/TournamentByCode";

function renderWithCode(code = "ABC123") {
  return render(
    <MemoryRouter initialEntries={[`/spectate/${code}`]}>
      <ChakraProvider value={defaultSystem}>
        <Routes>
          <Route path="/spectate/:code" element={<TournamentByCode />} />
        </Routes>
      </ChakraProvider>
    </MemoryRouter>,
  );
}

describe("TournamentByCode – loading state (!resolvedId, !notFound)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows Spinner while the API request is in flight", () => {
    // Never-resolving promise keeps us in loading state
    mockGet.mockReturnValueOnce(new Promise(() => {}));
    renderWithCode();
    // Chakra Spinner renders a div with role="status" by default
    const spinner = document.querySelector("[data-scope='spinner']")
      ?? document.querySelector("svg[aria-label]")
      ?? document.querySelector(".chakra-spinner");
    // Check for loading indicator
    expect(spinner ?? screen.queryByText(/tournament not found/i)).not.toBeNull();
    expect(screen.queryByText(/tournament not found/i)).not.toBeInTheDocument();
  });
});

describe("TournamentByCode – notFound=true (catch branch)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows 'Tournament Not Found' when API rejects", async () => {
    mockGet.mockRejectedValueOnce(new Error("Not found"));
    renderWithCode("ZZZ999");
    await waitFor(() =>
      expect(screen.getByText(/tournament not found/i)).toBeInTheDocument(),
    );
    expect(screen.getByText(/ZZZ999/i)).toBeInTheDocument();
  });
});

describe("TournamentByCode – resolvedId set (success path)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders TournamentViewPage with the resolved id", async () => {
    mockGet.mockResolvedValueOnce({ success: true, data: { _id: "tour-123" } });
    renderWithCode("ABC123");
    await waitFor(() =>
      expect(screen.getByTestId("view-page")).toBeInTheDocument(),
    );
    expect(screen.getByText("id:tour-123")).toBeInTheDocument();
  });
});
