/**
 * Branch coverage for StatisticsPage.tsx.
 * Covers: loading state, error branches (Error vs non-Error), success with full data,
 * success with empty arrays, cachedAt present/absent, recentTournaments empty,
 * winnerFaction present/absent, c.completed > 0 branch, f/p wins singular/plural,
 * player rank color branches (i===0, i===1, i>=2), player factions filter branch.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";

vi.mock("@/core/api/httpClient", () => ({
  httpClient: { get: vi.fn() },
}));

import { httpClient } from "@/core/api/httpClient";
import StatisticsPage from "@/features/statistics/components/StatisticsPage";

const mockGet = vi.mocked(httpClient.get);

function renderPage() {
  return render(
    <ChakraProvider value={defaultSystem}>
      <StatisticsPage />
    </ChakraProvider>,
  );
}

const fullStats = {
  cachedAt: "2026-06-14T10:00:00Z",
  tournaments: { pending: 1, active: 2, completed: 5, total: 8 },
  matches: { pending: 3, in_progress: 1, completed: 20, disputed: 0, total: 24, completionRate: 0.83 },
  topFactions: [
    { faction: "Empire", wins: 5 },
    { faction: "Dwarfs", wins: 3 },
    { faction: "Greenskins", wins: 1 },
  ],
  topPlayers: [
    { name: "PlayerOne", wins: 7, factions: ["Empire", "Dwarfs"] },
    { name: "PlayerTwo", wins: 4, factions: [] },
    { name: "PlayerThree", wins: 2, factions: ["Greenskins"] },
  ],
  topCreators: [
    { username: "Creator1", tournamentsCreated: 10, completed: 5 },
    { username: "Creator2", tournamentsCreated: 3, completed: 0 },
  ],
  recentWinners: [
    { tournamentName: "Grand Cup", tournamentType: "Single Elimination", winnerName: "Hero1", winnerFaction: "Empire", completedAt: "2026-06-13T00:00:00Z" },
    { tournamentName: "Minor Cup", tournamentType: "Round Robin", winnerName: "Hero2", winnerFaction: "", completedAt: "2026-06-12T00:00:00Z" },
  ],
  recentTournaments: [
    { _id: "t1", name: "Past Cup", tournamentType: "Swiss System", participants: [{ name: "A", faction: "Empire" }], playerCount: 8, createdAt: "2026-06-10T00:00:00Z" },
  ],
};

describe("StatisticsPage – loading state", () => {
  beforeEach(() => mockGet.mockReset());

  it("shows spinner while loading", async () => {
    // Deferred promise: keeps component in loading state until we resolve it
    let resolveGet!: (v: unknown) => void;
    mockGet.mockImplementationOnce(
      () => new Promise((r) => { resolveGet = r; }),
    );
    renderPage();
    // Component renders with loading=true initially
    expect(screen.getByText(/loading statistics/i)).toBeInTheDocument();
    // Resolve so the promise doesn't hang the test runner
    await act(async () => {
      resolveGet({ success: true, data: { ...fullStats, topFactions: [], topPlayers: [], topCreators: [], recentWinners: [], recentTournaments: [] } });
    });
  });
});

describe("StatisticsPage – error states", () => {
  beforeEach(() => mockGet.mockReset());

  it("shows error message when API throws an Error instance", async () => {
    mockGet.mockRejectedValueOnce(new Error("Network failure"));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("Network failure")).toBeInTheDocument(),
    );
  });

  it("shows generic message when API throws a non-Error", async () => {
    mockGet.mockRejectedValueOnce("string error");
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByText("Failed to load statistics"),
      ).toBeInTheDocument(),
    );
  });

  it("shows 'No data available' when API returns null data (stats is null)", async () => {
    mockGet.mockResolvedValueOnce({ success: true, data: null });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("No data available.")).toBeInTheDocument(),
    );
  });
});

describe("StatisticsPage – success with full data", () => {
  beforeEach(() => mockGet.mockReset());

  it("renders tournament total count", async () => {
    mockGet.mockResolvedValueOnce({ success: true, data: fullStats });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("8")).toBeInTheDocument(),
    );
  });

  it("shows cachedAt time when present", async () => {
    mockGet.mockResolvedValueOnce({ success: true, data: fullStats });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/updated/i)).toBeInTheDocument(),
    );
  });

  it("shows top faction names", async () => {
    mockGet.mockResolvedValueOnce({ success: true, data: fullStats });
    renderPage();
    await waitFor(() => {
      // "Empire" appears both as a faction card and inside the player faction list;
      // at least one instance should be present
      expect(screen.getAllByText("Empire").length).toBeGreaterThan(0);
    });
  });

  it("shows plural 'wins' for faction with multiple wins", async () => {
    mockGet.mockResolvedValueOnce({ success: true, data: fullStats });
    renderPage();
    await waitFor(() => {
      const allWins = screen.getAllByText(/\d+ wins?/);
      const plural = allWins.find((el) => el.textContent?.includes("5 wins"));
      expect(plural).toBeTruthy();
    });
  });

  it("shows singular 'win' for faction with exactly 1 win", async () => {
    mockGet.mockResolvedValueOnce({ success: true, data: fullStats });
    renderPage();
    await waitFor(() => {
      const singular = screen.getAllByText(/1 win$/).filter((el) => el.textContent === "1 win");
      expect(singular.length).toBeGreaterThan(0);
    });
  });

  it("shows top player names", async () => {
    mockGet.mockResolvedValueOnce({ success: true, data: fullStats });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("PlayerOne")).toBeInTheDocument(),
    );
  });

  it("shows player faction list when factions are non-empty", async () => {
    mockGet.mockResolvedValueOnce({ success: true, data: fullStats });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("Empire, Dwarfs")).toBeInTheDocument(),
    );
  });

  it("shows recent winner tournament name", async () => {
    mockGet.mockResolvedValueOnce({ success: true, data: fullStats });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("Grand Cup")).toBeInTheDocument(),
    );
  });

  it("shows top creators with completed badge when completed > 0", async () => {
    mockGet.mockResolvedValueOnce({ success: true, data: fullStats });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("5 done")).toBeInTheDocument(),
    );
  });

  it("does not show 'done' badge for creator with completed = 0", async () => {
    mockGet.mockResolvedValueOnce({ success: true, data: fullStats });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("Creator2")).toBeInTheDocument(),
    );
    // Creator2 has completed=0, so no "done" badge with count 0
    const doneBadges = screen.queryAllByText(/0 done/);
    expect(doneBadges).toHaveLength(0);
  });

  it("shows recent completed tournaments section when recentTournaments is non-empty", async () => {
    mockGet.mockResolvedValueOnce({ success: true, data: fullStats });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("Past Cup")).toBeInTheDocument(),
    );
  });
});

describe("StatisticsPage – empty arrays", () => {
  beforeEach(() => mockGet.mockReset());

  const emptyStats = {
    ...fullStats,
    topFactions: [],
    topPlayers: [],
    topCreators: [],
    recentWinners: [],
    recentTournaments: [],
    cachedAt: undefined,
  };

  it("shows 'No faction data yet' when topFactions is empty", async () => {
    mockGet.mockResolvedValueOnce({ success: true, data: emptyStats });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("No faction data yet.")).toBeInTheDocument(),
    );
  });

  it("shows 'No player data yet' when topPlayers is empty", async () => {
    mockGet.mockResolvedValueOnce({ success: true, data: emptyStats });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("No player data yet.")).toBeInTheDocument(),
    );
  });

  it("shows 'No data yet' when topCreators is empty", async () => {
    mockGet.mockResolvedValueOnce({ success: true, data: emptyStats });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("No data yet.")).toBeInTheDocument(),
    );
  });

  it("shows no-recent-winners message when recentWinners is empty", async () => {
    mockGet.mockResolvedValueOnce({ success: true, data: emptyStats });
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByText(/no tournaments completed in the last 7 days/i),
      ).toBeInTheDocument(),
    );
  });

  it("does not render 'Recent Completed Tournaments' section when recentTournaments is empty", async () => {
    mockGet.mockResolvedValueOnce({ success: true, data: emptyStats });
    renderPage();
    await waitFor(() =>
      expect(screen.queryByText("Past Cup")).not.toBeInTheDocument(),
    );
  });

  it("does not show cachedAt when absent", async () => {
    mockGet.mockResolvedValueOnce({ success: true, data: emptyStats });
    renderPage();
    await waitFor(() =>
      expect(screen.queryByText(/updated/i)).not.toBeInTheDocument(),
    );
  });
});
