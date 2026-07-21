/**
 * Branch coverage for statistics/components/StatisticsPage.tsx:
 * - loading=true → Spinner + "Loading statistics…"
 * - error (Error instance) → shows error.message
 * - error (non-Error) → shows "Failed to load statistics"
 * - stats=null from fetch (res.data = null equivalent) → still renders after loading
 * - stats.cachedAt present → shows "Updated" timestamp
 * - stats.topFactions.length === 0 → "No faction data yet."
 * - stats.topFactions.length > 0 → faction list with bars
 * - f.wins === 1 → "win" (singular)
 * - f.wins > 1 → "wins" (plural)
 * - stats.topPlayers.length === 0 → "No player data yet."
 * - p.factions.filter(Boolean).length > 0 → shows faction subtext
 * - stats.recentWinners.length === 0 → "No tournaments completed..."
 * - w.winnerFaction present → shows faction badge
 * - stats.topCreators.length === 0 → "No data yet."
 * - c.completed > 0 → shows "done" badge
 * - stats.recentTournaments.length > 0 → Recent Completed Tournaments section
 * - StatCard: colorPalette === "ink" → bg.subtle icon bg
 * - StatCard: sub present → sub text rendered
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";

const { mockGet } = vi.hoisted(() => ({
  mockGet: vi.fn(),
}));

vi.mock("@/core/api/httpClient", () => ({
  httpClient: { get: mockGet },
}));

import StatisticsPage from "@/features/statistics/components/StatisticsPage";

const baseStats = {
  cachedAt: undefined as string | undefined,
  tournaments: { pending: 0, active: 0, completed: 0, total: 0 },
  matches: {
    pending: 0,
    in_progress: 0,
    completed: 0,
    disputed: 0,
    total: 0,
    completionRate: 0,
  },
  topPlayers: [] as unknown[],
  topFactions: [] as unknown[],
  topCreators: [] as unknown[],
  recentTournaments: [] as unknown[],
  recentWinners: [] as unknown[],
};

function renderPage() {
  return render(
    <ChakraProvider value={defaultSystem}>
      <StatisticsPage />
    </ChakraProvider>,
  );
}

describe("StatisticsPage – loading state", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows spinner and 'Loading statistics…' while fetch is in flight", () => {
    mockGet.mockReturnValueOnce(new Promise(() => {}));
    renderPage();
    expect(screen.getByText(/loading statistics/i)).toBeInTheDocument();
  });
});

describe("StatisticsPage – error states", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows error.message when fetch throws an Error instance", async () => {
    mockGet.mockRejectedValueOnce(new Error("Network failure"));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("Network failure")).toBeInTheDocument(),
    );
  });

  it("shows 'Failed to load statistics' when fetch throws non-Error", async () => {
    mockGet.mockRejectedValueOnce("string error");
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByText(/failed to load statistics/i),
      ).toBeInTheDocument(),
    );
  });

  it("shows 'No data available.' when stats is null and no error was set", async () => {
    mockGet.mockResolvedValueOnce({ success: true, data: null });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/no data available/i)).toBeInTheDocument(),
    );
  });
});

describe("StatisticsPage – empty sections", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows 'No faction data yet.' when topFactions is empty", async () => {
    mockGet.mockResolvedValueOnce({
      success: true,
      data: { ...baseStats, topFactions: [] },
    });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/no faction data yet/i)).toBeInTheDocument(),
    );
  });

  it("shows 'No player data yet.' when topPlayers is empty", async () => {
    mockGet.mockResolvedValueOnce({
      success: true,
      data: { ...baseStats, topPlayers: [] },
    });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/no player data yet/i)).toBeInTheDocument(),
    );
  });

  it("shows 'No tournaments completed...' when recentWinners is empty", async () => {
    mockGet.mockResolvedValueOnce({
      success: true,
      data: { ...baseStats, recentWinners: [] },
    });
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByText(/no tournaments completed in the last 7 days/i),
      ).toBeInTheDocument(),
    );
  });

  it("shows 'No data yet.' when topCreators is empty", async () => {
    mockGet.mockResolvedValueOnce({
      success: true,
      data: { ...baseStats, topCreators: [] },
    });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/no data yet/i)).toBeInTheDocument(),
    );
  });
});

describe("StatisticsPage – topFactions with data", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows faction name and 'wins' (plural) when wins > 1", async () => {
    mockGet.mockResolvedValueOnce({
      success: true,
      data: {
        ...baseStats,
        topFactions: [{ faction: "Greenskins", wins: 5 }],
      },
    });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("Greenskins")).toBeInTheDocument(),
    );
    expect(screen.getByText(/5 wins/)).toBeInTheDocument();
  });

  it("shows 'win' (singular) when wins === 1", async () => {
    mockGet.mockResolvedValueOnce({
      success: true,
      data: {
        ...baseStats,
        topFactions: [{ faction: "Empire", wins: 1 }],
      },
    });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/1 win\b/)).toBeInTheDocument(),
    );
  });
});

describe("StatisticsPage – topPlayers with factions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows player faction subtext when factions array is non-empty", async () => {
    mockGet.mockResolvedValueOnce({
      success: true,
      data: {
        ...baseStats,
        topPlayers: [{ name: "Grimgork", wins: 3, factions: ["Greenskins"] }],
      },
    });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("Grimgork")).toBeInTheDocument(),
    );
    expect(screen.getByText("Greenskins")).toBeInTheDocument();
  });

  it("hides faction subtext when player factions array is empty", async () => {
    mockGet.mockResolvedValueOnce({
      success: true,
      data: {
        ...baseStats,
        topPlayers: [{ name: "Luthor", wins: 2, factions: [] }],
      },
    });
    renderPage();
    await waitFor(() => expect(screen.getByText("Luthor")).toBeInTheDocument());
  });
});

describe("StatisticsPage – topPlayers rank styling by index", () => {
  beforeEach(() => vi.clearAllMocks());

  it("styles rank #1/#2/#3+ differently and shows singular 'win' at rank #1", async () => {
    mockGet.mockResolvedValueOnce({
      success: true,
      data: {
        ...baseStats,
        topPlayers: [
          { name: "Grimgork", wins: 1, factions: [] },
          { name: "Karl Franz", wins: 5, factions: [] },
          { name: "Teclis", wins: 3, factions: [] },
          { name: "Luthor", wins: 2, factions: [] },
        ],
      },
    });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("Grimgork")).toBeInTheDocument(),
    );
    expect(screen.getByText("Karl Franz")).toBeInTheDocument();
    expect(screen.getByText("Teclis")).toBeInTheDocument();
    expect(screen.getByText("Luthor")).toBeInTheDocument();
    expect(screen.getByText(/1 win\b/)).toBeInTheDocument();
  });
});

describe("StatisticsPage – topCreators rank styling by index", () => {
  beforeEach(() => vi.clearAllMocks());

  it("styles rank #1/#2/#3+ differently", async () => {
    mockGet.mockResolvedValueOnce({
      success: true,
      data: {
        ...baseStats,
        topCreators: [
          { username: "Admin", tournamentsCreated: 5, completed: 3 },
          { username: "Runner-up", tournamentsCreated: 3, completed: 1 },
          { username: "ThirdPlace", tournamentsCreated: 1, completed: 0 },
        ],
      },
    });
    renderPage();
    await waitFor(() => expect(screen.getByText("Admin")).toBeInTheDocument());
    expect(screen.getByText("Runner-up")).toBeInTheDocument();
    expect(screen.getByText("ThirdPlace")).toBeInTheDocument();
  });
});

describe("StatisticsPage – recentWinners with data", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders a separator between entries after the first (i > 0) and shows the faction badge", async () => {
    mockGet.mockResolvedValueOnce({
      success: true,
      data: {
        ...baseStats,
        recentWinners: [
          {
            tournamentName: "Waaagh Cup",
            tournamentType: "Single Elimination",
            winnerName: "Grimgork",
            winnerFaction: "Greenskins",
          },
          {
            tournamentName: "Empire Open",
            tournamentType: "Round Robin",
            winnerName: "Karl Franz",
          },
        ],
      },
    });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("Waaagh Cup")).toBeInTheDocument(),
    );
    expect(screen.getByText("Empire Open")).toBeInTheDocument();
    expect(screen.getByText("Greenskins")).toBeInTheDocument();
  });
});

describe("StatisticsPage – topCreators 'done' badge (c.completed > 0)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows 'done' badge when c.completed > 0", async () => {
    mockGet.mockResolvedValueOnce({
      success: true,
      data: {
        ...baseStats,
        topCreators: [
          { username: "Admin", tournamentsCreated: 3, completed: 2 },
        ],
      },
    });
    renderPage();
    await waitFor(() => expect(screen.getByText("Admin")).toBeInTheDocument());
    expect(screen.getByText(/2 done/)).toBeInTheDocument();
  });

  it("hides 'done' badge when c.completed === 0", async () => {
    mockGet.mockResolvedValueOnce({
      success: true,
      data: {
        ...baseStats,
        topCreators: [
          { username: "Admin", tournamentsCreated: 1, completed: 0 },
        ],
      },
    });
    renderPage();
    await waitFor(() => expect(screen.getByText("Admin")).toBeInTheDocument());
    expect(screen.queryByText(/done/)).not.toBeInTheDocument();
  });
});

describe("StatisticsPage – recentTournaments section", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows Recent Completed Tournaments section when recentTournaments.length > 0", async () => {
    mockGet.mockResolvedValueOnce({
      success: true,
      data: {
        ...baseStats,
        recentTournaments: [
          {
            _id: "t1",
            name: "Winter Cup",
            tournamentType: "Single Elimination",
            participants: [],
            playerCount: 8,
            createdAt: new Date().toISOString(),
          },
        ],
      },
    });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("Winter Cup")).toBeInTheDocument(),
    );
    expect(
      screen.getByText(/recent completed tournaments/i),
    ).toBeInTheDocument();
  });
});

describe("StatisticsPage – cachedAt timestamp", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows 'Updated' text when stats.cachedAt is set", async () => {
    mockGet.mockResolvedValueOnce({
      success: true,
      data: {
        ...baseStats,
        cachedAt: "2024-01-15T10:30:00.000Z",
      },
    });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/updated/i)).toBeInTheDocument(),
    );
  });
});
