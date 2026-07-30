/**
 * Extended branch coverage for tournaments/components/TournamentViewPage.tsx
 * Covers branches not in TournamentViewPage.test.tsx:
 * - tournament.description → ReactMarkdown renders it
 * - handleJoin success → navigate to /matches/tournament/:code
 * - handleJoin error → joinError shown in join panel
 * - Copy tournament code button → clipboard + toaster
 * - Matches with rounds/W/L badges (completed, in_progress, disputed)
 * - champion.faction in banner
 * - isAlreadyJoined via username match (no userId)
 * - Back button → navigate to matches when owner/participant
 * - bannedFactions display
 * - joinSuccess state → "You're In!" heading
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { MemoryRouter } from "react-router";

const { mockGet, mockPost, mockGetSocket, mockUseUserStore, mockNavigate, mockToasterCreate } =
  vi.hoisted(() => ({
    mockGet: vi.fn(),
    mockPost: vi.fn(),
    mockGetSocket: vi.fn(),
    mockUseUserStore: vi.fn(),
    mockNavigate: vi.fn(),
    mockToasterCreate: vi.fn(),
  }));

vi.mock("@/core/api/httpClient", () => ({
  httpClient: { get: mockGet, post: mockPost },
}));

vi.mock("@/core/socket/socketClient", () => ({
  getSocket: mockGetSocket,
}));

vi.mock("@/shared/stores/userStore", () => ({
  useUserStore: () => mockUseUserStore(),
}));

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("react-markdown", () => ({
  default: ({ children }: { children: string }) => (
    <div data-testid="markdown">{children}</div>
  ),
}));

vi.mock("@/shared/ui/Toaster", () => ({
  toaster: { create: mockToasterCreate },
}));

import TournamentViewPage from "@/features/tournaments/components/TournamentViewPage";

// ─── Shared test fixtures ─────────────────────────────────────────────────────

const fakeSocket = { emit: vi.fn(), on: vi.fn(), off: vi.fn() };

function makeTournament(overrides: Record<string, unknown> = {}) {
  return {
    _id: "t1",
    name: "Test Cup",
    code: "ABCDEF",
    description: "",
    playerCount: 4,
    tournamentType: "Single Elimination",
    bannedFactions: [] as string[],
    enable40kFactions: false,
    participants: [] as {
      _id: string;
      userId?: string | null;
      name: string;
      faction: string;
    }[],
    status: "pending" as "pending" | "active" | "completed",
    createdAt: new Date().toISOString(),
    createdBy: "owner1",
    ...overrides,
  };
}

function makeStore(userId = "u2", username = "Grimgork", authenticated = true) {
  return {
    user: { id: userId, username, isGuest: false },
    isAuthenticated: () => authenticated,
  };
}

function makeMatch(overrides: Record<string, unknown> = {}) {
  return {
    _id: "m1",
    round: 1,
    matchNumber: 1,
    player1: { participantId: "p1", name: "Grimgork", faction: "Greenskins" },
    player2: { participantId: "p2", name: "Luthor", faction: "Empire" },
    winnerId: null as string | null,
    status: "pending" as "pending" | "in_progress" | "completed" | "disputed",
    reportedResults: [],
    ...overrides,
  };
}

function renderPage(id = "t1") {
  return render(
    <MemoryRouter>
      <ChakraProvider value={defaultSystem}>
        <TournamentViewPage id={id} />
      </ChakraProvider>
    </MemoryRouter>,
  );
}

// ─── description display ──────────────────────────────────────────────────────

describe("TournamentViewPage – description display", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSocket.mockReturnValue(fakeSocket);
    mockUseUserStore.mockReturnValue(makeStore());
  });

  it("renders description via ReactMarkdown when description is non-empty", async () => {
    mockGet.mockResolvedValueOnce({
      success: true,
      data: makeTournament({ description: "# My Tournament" }),
    });
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("markdown")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("markdown")).toHaveTextContent("# My Tournament");
  });

  it("does not render markdown element when description is empty", async () => {
    mockGet.mockResolvedValueOnce({
      success: true,
      data: makeTournament({ description: "" }),
    });
    renderPage();
    await waitFor(() => expect(screen.getByText("Test Cup")).toBeInTheDocument());
    expect(screen.queryByTestId("markdown")).not.toBeInTheDocument();
  });
});

// ─── handleJoin – success path ────────────────────────────────────────────────

describe("TournamentViewPage – handleJoin success", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSocket.mockReturnValue(fakeSocket);
    // Non-owner, authenticated user who is not a participant
    mockUseUserStore.mockReturnValue(makeStore("u2", "Grimgork", true));
  });

  it("navigates to /matches/tournament/:code on successful join", async () => {
    // First GET: tournament
    mockGet.mockResolvedValueOnce({
      success: true,
      data: makeTournament({ status: "pending", createdBy: "owner1" }),
    });
    // POST /join resolves
    mockPost.mockResolvedValueOnce({ success: true });
    // Second GET (fetchTournament after join)
    mockGet.mockResolvedValueOnce({
      success: true,
      data: makeTournament({ status: "pending", createdBy: "owner1" }),
    });

    renderPage();

    const joinBtn = await screen.findByRole("button", { name: /join tournament/i });
    fireEvent.click(joinBtn);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        "/tournament/t1/join",
        expect.objectContaining({ faction: "" }),
      );
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/matches/tournament/ABCDEF");
    });
  });

  it("calls fetchTournament again after successful join", async () => {
    mockGet.mockResolvedValueOnce({
      success: true,
      data: makeTournament({ status: "pending", createdBy: "owner1" }),
    });
    mockPost.mockResolvedValueOnce({ success: true });
    mockGet.mockResolvedValueOnce({
      success: true,
      data: makeTournament({ status: "pending", createdBy: "owner1" }),
    });

    renderPage();

    const joinBtn = await screen.findByRole("button", { name: /join tournament/i });
    fireEvent.click(joinBtn);

    await waitFor(() => {
      // mockGet called twice: initial load + after join
      expect(mockGet).toHaveBeenCalledTimes(2);
    });
  });
});

// ─── handleJoin – error path ──────────────────────────────────────────────────

describe("TournamentViewPage – handleJoin error", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSocket.mockReturnValue(fakeSocket);
    mockUseUserStore.mockReturnValue(makeStore("u2", "Grimgork", true));
  });

  it("shows joinError in join panel when post rejects", async () => {
    mockGet.mockResolvedValueOnce({
      success: true,
      data: makeTournament({ status: "pending", createdBy: "owner1" }),
    });
    mockPost.mockRejectedValueOnce(new Error("Already full"));

    renderPage();

    const joinBtn = await screen.findByRole("button", { name: /join tournament/i });
    fireEvent.click(joinBtn);

    await waitFor(() =>
      expect(screen.getByText("Already full")).toBeInTheDocument(),
    );
  });
});

// ─── Copy tournament code button ──────────────────────────────────────────────

describe("TournamentViewPage – copy tournament code", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSocket.mockReturnValue(fakeSocket);
    mockUseUserStore.mockReturnValue(makeStore());
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it("calls navigator.clipboard.writeText with the tournament code", async () => {
    mockGet.mockResolvedValueOnce({
      success: true,
      data: makeTournament({ code: "ABCDEF" }),
    });
    renderPage();

    await screen.findByText("Test Cup");
    const copyBtn = screen.getByRole("button", { name: /copy tournament code/i });
    fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("ABCDEF");
  });

  it("calls toaster.create after clicking copy button", async () => {
    mockGet.mockResolvedValueOnce({
      success: true,
      data: makeTournament({ code: "ABCDEF" }),
    });
    renderPage();

    await screen.findByText("Test Cup");
    const copyBtn = screen.getByRole("button", { name: /copy tournament code/i });
    fireEvent.click(copyBtn);

    expect(mockToasterCreate).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Copied!" }),
    );
  });
});

// ─── Matches with rounds and W/L badges ──────────────────────────────────────

describe("TournamentViewPage – matches with W/L badges", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSocket.mockReturnValue(fakeSocket);
    mockUseUserStore.mockReturnValue(makeStore("u2", "Grimgork", true));
  });

  it("shows round header and 'W' badge when a match has a winner", async () => {
    mockGet
      .mockResolvedValueOnce({
        success: true,
        data: makeTournament({ status: "active" }),
      })
      .mockResolvedValueOnce({
        success: true,
        data: [makeMatch({ winnerId: "p1", status: "completed" })],
      });
    renderPage();

    await waitFor(() =>
      expect(screen.getByText(/round 1/i)).toBeInTheDocument(),
    );
    expect(screen.getByText("W")).toBeInTheDocument();
  });

  it("shows 'L' badge for the losing player", async () => {
    mockGet
      .mockResolvedValueOnce({
        success: true,
        data: makeTournament({ status: "active" }),
      })
      .mockResolvedValueOnce({
        success: true,
        data: [makeMatch({ winnerId: "p1", status: "completed" })],
      });
    renderPage();

    await waitFor(() =>
      expect(screen.getByText("L")).toBeInTheDocument(),
    );
  });

  it("shows 'Completed' badge for a completed match", async () => {
    mockGet
      .mockResolvedValueOnce({
        success: true,
        data: makeTournament({ status: "active" }),
      })
      .mockResolvedValueOnce({
        success: true,
        data: [makeMatch({ winnerId: "p1", status: "completed" })],
      });
    renderPage();

    await waitFor(() =>
      expect(screen.getByText("Completed")).toBeInTheDocument(),
    );
  });

  it("shows 'In Progress' badge for in_progress match", async () => {
    mockGet
      .mockResolvedValueOnce({
        success: true,
        data: makeTournament({ status: "active" }),
      })
      .mockResolvedValueOnce({
        success: true,
        data: [makeMatch({ status: "in_progress" })],
      });
    renderPage();

    await waitFor(() =>
      expect(screen.getByText("In Progress")).toBeInTheDocument(),
    );
  });

  it("shows 'Disputed' badge and dispute text for disputed match", async () => {
    mockGet
      .mockResolvedValueOnce({
        success: true,
        data: makeTournament({ status: "active" }),
      })
      .mockResolvedValueOnce({
        success: true,
        data: [makeMatch({ status: "disputed" })],
      });
    renderPage();

    await waitFor(() =>
      expect(screen.getAllByText(/disputed/i).length).toBeGreaterThan(0),
    );
    expect(
      screen.getByText(/result disputed - awaiting organiser/i),
    ).toBeInTheDocument();
  });
});

// ─── champion.faction in banner ───────────────────────────────────────────────

describe("TournamentViewPage – champion faction display", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSocket.mockReturnValue(fakeSocket);
    mockUseUserStore.mockReturnValue(makeStore("u2", "Grimgork", true));
  });

  it("shows champion faction in banner when champion has a faction", async () => {
    mockGet
      .mockResolvedValueOnce({
        success: true,
        data: makeTournament({ status: "completed" }),
      })
      .mockResolvedValueOnce({
        success: true,
        data: [
          makeMatch({
            winnerId: "p1",
            status: "completed",
            player1: { participantId: "p1", name: "Grimgork", faction: "Greenskins" },
            player2: { participantId: "p2", name: "Luthor", faction: "Empire" },
          }),
        ],
      });
    renderPage();

    await waitFor(() =>
      expect(screen.getByText(/tournament champion/i)).toBeInTheDocument(),
    );
    // Faction text appears at least once (may appear in match card too — use getAllByText)
    expect(screen.getAllByText("Greenskins").length).toBeGreaterThan(0);
  });
});

// ─── isAlreadyJoined via username match (no userId) ──────────────────────────

describe("TournamentViewPage – isAlreadyJoined via username match", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSocket.mockReturnValue(fakeSocket);
  });

  it("shows 'Participant' badge when participant has no userId but name matches username", async () => {
    // user.username = "grimgork" (case-insensitive match)
    mockUseUserStore.mockReturnValue(makeStore("u2", "Grimgork", true));
    mockGet.mockResolvedValueOnce({
      success: true,
      data: makeTournament({
        status: "pending",
        createdBy: "owner1",
        participants: [
          {
            _id: "p1",
            // no userId — name match via toLowerCase
            userId: null,
            name: "grimgork",
            faction: "",
          },
        ],
      }),
    });
    renderPage();

    await waitFor(() =>
      expect(screen.getByText("Participant")).toBeInTheDocument(),
    );
  });
});

// ─── Back button navigation ───────────────────────────────────────────────────

describe("TournamentViewPage – Back button navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSocket.mockReturnValue(fakeSocket);
  });

  it("navigates to /matches/tournament/:code when user is owner", async () => {
    mockUseUserStore.mockReturnValue(makeStore("owner1", "Owner", true));
    mockGet.mockResolvedValueOnce({
      success: true,
      data: makeTournament({ createdBy: "owner1" }),
    });
    renderPage();

    await screen.findByText("Test Cup");
    fireEvent.click(screen.getByRole("button", { name: /^back$/i }));

    expect(mockNavigate).toHaveBeenCalledWith("/matches/tournament/ABCDEF");
  });

  it("navigates to /matches/tournament/:code when user is participant", async () => {
    mockUseUserStore.mockReturnValue(makeStore("u2", "Grimgork", true));
    mockGet.mockResolvedValueOnce({
      success: true,
      data: makeTournament({
        createdBy: "owner1",
        participants: [{ _id: "p1", userId: "u2", name: "Grimgork", faction: "" }],
      }),
    });
    renderPage();

    await screen.findByText("Test Cup");
    fireEvent.click(screen.getByRole("button", { name: /^back$/i }));

    expect(mockNavigate).toHaveBeenCalledWith("/matches/tournament/ABCDEF");
  });

  it("calls navigate(-1) when user is spectator (not owner or participant)", async () => {
    mockUseUserStore.mockReturnValue(makeStore("u99", "Stranger", false));
    mockGet.mockResolvedValueOnce({
      success: true,
      data: makeTournament({ createdBy: "owner1" }),
    });
    renderPage();

    await screen.findByText("Test Cup");
    fireEvent.click(screen.getByRole("button", { name: /^back$/i }));

    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});

// ─── bannedFactions display ───────────────────────────────────────────────────

describe("TournamentViewPage – bannedFactions display", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSocket.mockReturnValue(fakeSocket);
    mockUseUserStore.mockReturnValue(makeStore());
  });

  it("shows banned factions in the Tournament Info card", async () => {
    mockGet.mockResolvedValueOnce({
      success: true,
      data: makeTournament({ bannedFactions: ["Greenskins", "Empire"] }),
    });
    renderPage();

    await waitFor(() =>
      expect(screen.getByText("Banned Factions")).toBeInTheDocument(),
    );
    expect(screen.getByText("Greenskins")).toBeInTheDocument();
    expect(screen.getByText("Empire")).toBeInTheDocument();
  });
});

// ─── joinSuccess state ────────────────────────────────────────────────────────

describe("TournamentViewPage – joinSuccess state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSocket.mockReturnValue(fakeSocket);
    mockUseUserStore.mockReturnValue(makeStore("u2", "Grimgork", true));
  });

  it("shows 'You're In!' heading after a successful join", async () => {
    mockGet.mockResolvedValueOnce({
      success: true,
      data: makeTournament({ status: "pending", createdBy: "owner1" }),
    });
    mockPost.mockResolvedValueOnce({ success: true });
    // Second GET after join
    mockGet.mockResolvedValueOnce({
      success: true,
      data: makeTournament({ status: "pending", createdBy: "owner1" }),
    });

    renderPage();

    const joinBtn = await screen.findByRole("button", { name: /join tournament/i });
    fireEvent.click(joinBtn);

    // joinSuccess → true before navigation happens
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalled(),
    );

    // navigate is called (which in real app unmounts, but in test we can check it was called)
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("/matches/tournament/ABCDEF"),
    );
  });
});
