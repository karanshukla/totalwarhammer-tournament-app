/**
 * Branch coverage for TournamentBrowser.tsx:
 * - Line 88-90: `Array.isArray(statusFilter) ? statusFilter.join(",") : statusFilter`
 *   → true branch: statusFilter is an array (used in TournamentsPage for pending+active)
 * - Line 97: `err instanceof Error ? err.message : "Failed to load tournaments"`
 *   → false branch: error is not an Error instance → shows "Failed to load tournaments"
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { MemoryRouter } from "react-router-dom";
import TournamentBrowser from "@/features/tournaments/components/TournamentBrowser";

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock("@/core/api/httpClient", () => ({
  httpClient: { get: vi.fn() },
}));

vi.mock("@/shared/stores/userStore", () => ({
  useUserStore: vi.fn(() => ({
    user: {
      id: "u1",
      email: "test@test.com",
      username: "TestUser",
      isAuthenticated: true,
      isGuest: false,
    },
    isAuthenticated: vi.fn().mockReturnValue(true),
  })),
}));

import { httpClient } from "@/core/api/httpClient";

const mockGet = vi.mocked(httpClient.get);

function renderBrowser(statusFilter: "pending" | "active" | "completed" | ("pending" | "active" | "completed")[]) {
  return render(
    <ChakraProvider value={defaultSystem}>
      <MemoryRouter>
        <TournamentBrowser
          statusFilter={statusFilter}
          emptyMessage="No tournaments."
        />
      </MemoryRouter>
    </ChakraProvider>,
  );
}

describe("TournamentBrowser – array statusFilter (line 88-90 true branch)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("joins array statusFilter with comma in API request URL", async () => {
    mockGet.mockResolvedValueOnce({ success: true, data: [] });

    renderBrowser(["pending", "active"]);

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining("pending,active"),
      );
    });
  });

  it("renders empty message when statusFilter is array and no tournaments found", async () => {
    mockGet.mockResolvedValueOnce({ success: true, data: [] });

    renderBrowser(["pending", "active"]);

    await waitFor(() =>
      expect(screen.getByText("No tournaments.")).toBeInTheDocument(),
    );
  });
});

describe("TournamentBrowser – non-Error catch (line 97 false branch)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows generic 'Failed to load tournaments' when non-Error is thrown", async () => {
    mockGet.mockRejectedValueOnce("plain string error");

    renderBrowser("active");

    await waitFor(() =>
      expect(
        screen.getByText("Failed to load tournaments"),
      ).toBeInTheDocument(),
    );
  });

  it("shows error.message when Error instance is thrown (true branch for comparison)", async () => {
    mockGet.mockRejectedValueOnce(new Error("API is down"));

    renderBrowser("active");

    await waitFor(() =>
      expect(screen.getByText("API is down")).toBeInTheDocument(),
    );
  });
});
