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
 * - match-status fields (pending/in_progress/disputed/completionRate) rendered
 * - range switch → refetch with the new range, dynamic window subtitle
 * - "Show more" → renders more rows, refetching only when the page runs out
 * - per-section CSV export → unpaginated refetch + download
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

const emptyGameStats = {
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

const baseStats = {
  cachedAt: undefined as string | undefined,
  wh3: { ...emptyGameStats },
  "40k": { ...emptyGameStats },
};

// Build a stats payload with a partial patch applied to the wh3 game (the
// default tab), keeping the 40k game empty. Accepts an optional top-level
// override (e.g. cachedAt).
const withWh3 = (
  wh3Patch: Record<string, unknown>,
  top?: Record<string, unknown>,
) => ({
  ...baseStats,
  ...top,
  wh3: { ...emptyGameStats, ...wh3Patch },
});

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
      data: withWh3({ topFactions: [] }),
    });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/no faction data yet/i)).toBeInTheDocument(),
    );
  });

  it("shows 'No player data yet.' when topPlayers is empty", async () => {
    mockGet.mockResolvedValueOnce({
      success: true,
      data: withWh3({ topPlayers: [] }),
    });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/no player data yet/i)).toBeInTheDocument(),
    );
  });

  it("shows 'No tournaments completed...' when recentWinners is empty", async () => {
    mockGet.mockResolvedValueOnce({
      success: true,
      data: withWh3({ recentWinners: [] }),
    });
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByText(/no tournaments completed in this window/i),
      ).toBeInTheDocument(),
    );
  });

  it("shows 'No data yet.' when topCreators is empty", async () => {
    mockGet.mockResolvedValueOnce({
      success: true,
      data: withWh3({ topCreators: [] }),
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
      data: withWh3({ topFactions: [{ faction: "Greenskins", wins: 5 }] }),
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
      data: withWh3({ topFactions: [{ faction: "Empire", wins: 1 }] }),
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
      data: withWh3({
        topPlayers: [{ name: "Grimgork", wins: 3, factions: ["Greenskins"] }],
      }),
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
      data: withWh3({
        topPlayers: [{ name: "Luthor", wins: 2, factions: [] }],
      }),
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
      data: withWh3({
        topPlayers: [
          { name: "Grimgork", wins: 1, factions: [] },
          { name: "Karl Franz", wins: 5, factions: [] },
          { name: "Teclis", wins: 3, factions: [] },
          { name: "Luthor", wins: 2, factions: [] },
        ],
      }),
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
      data: withWh3({
        topCreators: [
          { username: "Admin", tournamentsCreated: 5, completed: 3 },
          { username: "Runner-up", tournamentsCreated: 3, completed: 1 },
          { username: "ThirdPlace", tournamentsCreated: 1, completed: 0 },
        ],
      }),
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
      data: withWh3({
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
      }),
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
      data: withWh3({
        topCreators: [
          { username: "Admin", tournamentsCreated: 3, completed: 2 },
        ],
      }),
    });
    renderPage();
    await waitFor(() => expect(screen.getByText("Admin")).toBeInTheDocument());
    expect(screen.getByText(/2 done/)).toBeInTheDocument();
  });

  it("hides 'done' badge when c.completed === 0", async () => {
    mockGet.mockResolvedValueOnce({
      success: true,
      data: withWh3({
        topCreators: [
          { username: "Admin", tournamentsCreated: 1, completed: 0 },
        ],
      }),
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
      data: withWh3({
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
      }),
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
      data: { ...baseStats, cachedAt: "2024-01-15T10:30:00.000Z" },
    });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/updated/i)).toBeInTheDocument(),
    );
  });
});

describe("StatisticsPage – game-system toggle", () => {
  beforeEach(() => vi.clearAllMocks());

  it("defaults to WH3 and switches to 40K data when the 40K toggle is clicked", async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValueOnce({
      success: true,
      data: {
        cachedAt: undefined,
        wh3: {
          ...emptyGameStats,
          topFactions: [{ faction: "Empire", wins: 4 }],
        },
        "40k": {
          ...emptyGameStats,
          topFactions: [{ faction: "Necrons", wins: 7 }],
        },
      },
    });
    renderPage();
    // WH3 is the default tab — Empire shows first.
    await waitFor(() => expect(screen.getByText("Empire")).toBeInTheDocument());
    expect(screen.queryByText("Necrons")).not.toBeInTheDocument();

    // Switch to 40K.
    await user.click(screen.getByRole("button", { name: "40K" }));
    await waitFor(() =>
      expect(screen.getByText("Necrons")).toBeInTheDocument(),
    );
    expect(screen.queryByText("Empire")).not.toBeInTheDocument();
  });

  it("returns to WH3 data when the WH3 toggle is clicked after 40K", async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValueOnce({
      success: true,
      data: {
        cachedAt: undefined,
        wh3: {
          ...emptyGameStats,
          topFactions: [{ faction: "Skaven", wins: 2 }],
        },
        "40k": {
          ...emptyGameStats,
          topFactions: [{ faction: "Orks", wins: 9 }],
        },
      },
    });
    renderPage();
    await waitFor(() => expect(screen.getByText("Skaven")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "40K" }));
    await waitFor(() => expect(screen.getByText("Orks")).toBeInTheDocument());
    // Back to WH3.
    await user.click(screen.getByRole("button", { name: "WH3" }));
    await waitFor(() => expect(screen.getByText("Skaven")).toBeInTheDocument());
  });
});

describe("StatisticsPage – match status granularity", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the pending, in-progress, disputed and completion-rate figures", async () => {
    mockGet.mockResolvedValueOnce({
      success: true,
      data: withWh3({
        tournaments: { pending: 4, active: 2, completed: 6, total: 12 },
        matches: {
          pending: 7,
          in_progress: 3,
          completed: 9,
          disputed: 1,
          total: 20,
          completionRate: 45,
        },
      }),
    });
    renderPage();

    await waitFor(() =>
      expect(screen.getByText(/pending tournaments/i)).toBeInTheDocument(),
    );
    expect(screen.getByText(/matches pending/i)).toBeInTheDocument();
    expect(screen.getByText(/matches in progress/i)).toBeInTheDocument();
    expect(screen.getByText(/disputed matches/i)).toBeInTheDocument();
    expect(screen.getByText("45%")).toBeInTheDocument();
    expect(screen.getByText("9 of 20")).toBeInTheDocument();
  });
});

describe("StatisticsPage – time range", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requests all-time on first load and refetches with the selected range", async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValue({ success: true, data: withWh3({}) });
    renderPage();

    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1));
    expect(mockGet.mock.calls[0][0]).toContain("range=all");

    await user.click(screen.getByRole("button", { name: "30d" }));

    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2));
    expect(mockGet.mock.calls[1][0]).toContain("range=30d");
  });

  it("labels the win-based sections with the selected window", async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValue({ success: true, data: withWh3({}) });
    renderPage();

    await waitFor(() =>
      expect(screen.getAllByText("All time").length).toBeGreaterThan(0),
    );

    await user.click(screen.getByRole("button", { name: "7d" }));

    await waitFor(() =>
      expect(screen.getAllByText("Last 7 days").length).toBeGreaterThan(0),
    );
  });
});

describe("StatisticsPage – show more", () => {
  beforeEach(() => vi.clearAllMocks());

  const factions = (count: number, from = 0) =>
    Array.from({ length: count }, (_, i) => ({
      faction: `Faction ${from + i}`,
      wins: 100 - (from + i),
    }));

  it("reports the total row count next to the visible page", async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: withWh3({ topFactions: factions(10), topFactionsTotal: 42 }),
    });
    renderPage();

    await waitFor(() =>
      expect(screen.getByText("Showing 10 of 42")).toBeInTheDocument(),
    );
  });

  it("refetches with a larger limit when the visible page runs out", async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValueOnce({
      success: true,
      data: withWh3({ topFactions: factions(10), topFactionsTotal: 42 }),
    });
    mockGet.mockResolvedValueOnce({
      success: true,
      data: withWh3({ topFactions: factions(20), topFactionsTotal: 42 }),
    });
    renderPage();

    await waitFor(() =>
      expect(screen.getByText("Faction 0")).toBeInTheDocument(),
    );
    expect(screen.queryByText("Faction 15")).not.toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: /show more/i })[0]);

    await waitFor(() =>
      expect(screen.getByText("Faction 15")).toBeInTheDocument(),
    );
    expect(mockGet.mock.calls[1][0]).toContain("limit=20");
  });

  it("stops offering 'Show more' when the server caps the list below the total", async () => {
    const user = userEvent.setup();
    // 50 rows is all the server will ever materialise here, but it honestly
    // reports 62 exist — the pager must not loop on a request that adds nothing.
    mockGet.mockResolvedValue({
      success: true,
      data: withWh3({ topFactions: factions(50), topFactionsTotal: 62 }),
    });
    renderPage();

    await waitFor(() =>
      expect(screen.getByText("Showing 10 of 62")).toBeInTheDocument(),
    );

    const showMore = () =>
      screen.queryAllByRole("button", { name: /show more/i })[0];
    for (let i = 0; i < 5; i++) {
      await user.click(showMore());
    }

    await waitFor(() =>
      expect(screen.getByText("Showing 50 of 62")).toBeInTheDocument(),
    );
    expect(showMore()).toBeUndefined();
  });

  it("hides the pager once every row is on screen", async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: withWh3({ topFactions: factions(3), topFactionsTotal: 3 }),
    });
    renderPage();

    await waitFor(() =>
      expect(screen.getByText("Showing 3 of 3")).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("button", { name: /show more/i }),
    ).not.toBeInTheDocument();
  });
});

describe("StatisticsPage – CSV export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("fetches the unpaginated list and hands the browser a CSV download", async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.fn(() => "blob:stats");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL });
    const clicked = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    mockGet.mockResolvedValue({
      success: true,
      data: withWh3({
        topFactions: [{ faction: "Empire", wins: 4, matchesPlayed: 6 }],
        topFactionsTotal: 1,
      }),
    });
    renderPage();

    await waitFor(() => expect(screen.getByText("Empire")).toBeInTheDocument());

    await user.click(
      screen.getByRole("button", {
        name: /export top winning factions as csv/i,
      }),
    );

    await waitFor(() => expect(clicked).toHaveBeenCalled());
    expect(mockGet).toHaveBeenLastCalledWith(
      expect.stringContaining("limit=200"),
    );
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:stats");
    vi.unstubAllGlobals();
  });
});

// Each section flattens to its own CSV shape. Exercising every one of them
// matters because a wrong column here is invisible in the UI — the file just
// silently carries the wrong data.
describe("StatisticsPage – CSV content per section", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  const populatedWh3 = {
    topFactions: [
      { faction: "Empire", wins: 4, matchesPlayed: 6, losses: 2, winRate: 67 },
    ],
    topFactionsTotal: 1,
    topPlayers: [
      {
        name: "Karl Franz",
        wins: 3,
        factions: ["Empire", ""],
        matchesPlayed: 5,
        losses: 2,
        winRate: 60,
      },
    ],
    topPlayersTotal: 1,
    recentWinners: [
      {
        tournamentName: "Waaagh Cup",
        tournamentType: "Single Elimination",
        winnerName: "Grimgork",
        winnerFaction: "Greenskins",
        completedAt: "2026-08-01T10:00:00.000Z",
      },
    ],
    recentWinnersTotal: 1,
    topCreators: [{ username: "Admin", tournamentsCreated: 3, completed: 2 }],
    topCreatorsTotal: 1,
    recentTournaments: [
      {
        _id: "t1",
        name: "Winter Cup",
        tournamentType: "Round Robin",
        participants: [
          { name: "a", faction: "" },
          { name: "b", faction: "" },
        ],
        playerCount: 8,
        createdAt: "2026-07-04T09:00:00.000Z",
      },
    ],
    recentTournamentsTotal: 1,
  };

  // Export the named section and hand back the CSV the browser was given.
  async function exportSection(buttonName: RegExp) {
    const user = userEvent.setup();
    const blobs: Blob[] = [];
    const createObjectURL = vi.fn((blob: Blob) => {
      blobs.push(blob);
      return "blob:section";
    });
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL,
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    mockGet.mockResolvedValue({ success: true, data: withWh3(populatedWh3) });
    renderPage();

    await waitFor(() =>
      expect(screen.getByText("Karl Franz")).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: buttonName }));
    await waitFor(() => expect(blobs.length).toBe(1));

    // The BOM is stripped by Blob.text()'s UTF-8 decode, so this is the body.
    const csv = await blobs[0].text();
    vi.unstubAllGlobals();
    return csv.split("\r\n");
  }

  it("writes faction rows with the extended win-rate columns", async () => {
    const rows = await exportSection(/export top winning factions as csv/i);
    expect(rows[0]).toBe("rank,faction,wins,matchesPlayed,losses,winRate");
    expect(rows[1]).toBe("1,Empire,4,6,2,67");
  });

  it("writes player rows and joins their factions into one cell", async () => {
    const rows = await exportSection(/export top players as csv/i);
    expect(rows[0]).toBe(
      "rank,player,wins,matchesPlayed,losses,winRate,factions",
    );
    // Blank faction entries are dropped rather than leaving a dangling ";".
    expect(rows[1]).toBe("1,Karl Franz,3,5,2,60,Empire");
  });

  it("writes recent-winner rows", async () => {
    const rows = await exportSection(
      /export recent tournament winners as csv/i,
    );
    expect(rows[0]).toBe(
      "tournament,tournamentType,winner,winnerFaction,completedAt",
    );
    expect(rows[1]).toBe(
      "Waaagh Cup,Single Elimination,Grimgork,Greenskins,2026-08-01T10:00:00.000Z",
    );
  });

  it("writes creator rows", async () => {
    const rows = await exportSection(/export top tournament creators as csv/i);
    expect(rows[0]).toBe("rank,creator,tournamentsCreated,completed");
    expect(rows[1]).toBe("1,Admin,3,2");
  });

  it("writes recent-tournament rows with the roster size", async () => {
    const rows = await exportSection(
      /export recent completed tournaments as csv/i,
    );
    expect(rows[0]).toBe(
      "tournament,tournamentType,players,playerCount,createdAt",
    );
    // players is who actually joined; playerCount is the configured capacity.
    expect(rows[1]).toBe("Winter Cup,Round Robin,2,8,2026-07-04T09:00:00.000Z");
  });

  it("leaves the extended columns blank when the server omits them", async () => {
    const user = userEvent.setup();
    const blobs: Blob[] = [];
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn((blob: Blob) => {
        blobs.push(blob);
        return "blob:legacy";
      }),
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    // A pre-upgrade payload: wins only, no matchesPlayed/losses/winRate.
    mockGet.mockResolvedValue({
      success: true,
      data: withWh3({
        topFactions: [{ faction: "Skaven", wins: 2 }],
        topFactionsTotal: 1,
      }),
    });
    renderPage();

    await waitFor(() => expect(screen.getByText("Skaven")).toBeInTheDocument());
    await user.click(
      screen.getByRole("button", {
        name: /export top winning factions as csv/i,
      }),
    );
    await waitFor(() => expect(blobs.length).toBe(1));

    const rows = (await blobs[0].text()).split("\r\n");
    expect(rows[1]).toBe("1,Skaven,2,,,");
    vi.unstubAllGlobals();
  });
});
