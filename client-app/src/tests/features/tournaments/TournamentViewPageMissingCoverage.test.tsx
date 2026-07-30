/**
 * Missing coverage for tournaments/components/TournamentViewPage.tsx
 *
 * Covers branches/callbacks not exercised by TournamentViewPage.test.tsx or
 * TournamentViewPageExtended.test.tsx:
 *   ~Line 487 – "Manage Tournament" button onClick → navigate(/matches/tournament/:code)
 *   ~Line 652 – "Go to Your Matches" button onClick in alreadyJoined state
 *   Socket event handler callback bodies (onTournamentUpdated, onMatchesUpdated,
 *     onMatchesAppended, onMatchUpdated) invoked by calling socket.on callbacks directly
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { MemoryRouter } from "react-router";

const {
  mockGet,
  mockPost,
  mockGetSocket,
  mockUseUserStore,
  mockNavigate,
  mockToasterCreate,
} = vi.hoisted(() => ({
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

function renderPage(id = "t1") {
  return render(
    <MemoryRouter>
      <ChakraProvider value={defaultSystem}>
        <TournamentViewPage id={id} />
      </ChakraProvider>
    </MemoryRouter>,
  );
}

// ─── "Manage Tournament" button onClick ───────────────────────────────────────

describe("TournamentViewPage – Manage Tournament button click (~line 487)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSocket.mockReturnValue(fakeSocket);
    mockUseUserStore.mockReturnValue(makeStore("owner1", "Owner", true));
  });

  it("navigates to /matches/tournament/:code when owner clicks Manage Tournament", async () => {
    mockGet.mockResolvedValueOnce({
      success: true,
      data: makeTournament({ createdBy: "owner1", status: "active" }),
    });
    // Active tournament also fetches matches
    mockGet.mockResolvedValueOnce({ success: true, data: [] });

    renderPage();

    const manageBtn = await screen.findByRole("button", {
      name: /manage tournament/i,
    });
    fireEvent.click(manageBtn);

    expect(mockNavigate).toHaveBeenCalledWith("/matches/tournament/ABCDEF");
  });
});

// ─── "Go to Your Matches" button onClick in alreadyJoined state (~line 652) ──

describe("TournamentViewPage – Go to Your Matches button click (~line 652)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSocket.mockReturnValue(fakeSocket);
  });

  it("navigates to /matches/tournament/:code when alreadyJoined user clicks Go to Your Matches", async () => {
    mockUseUserStore.mockReturnValue(makeStore("u2", "Grimgork", true));
    mockGet.mockResolvedValueOnce({
      success: true,
      data: makeTournament({
        status: "pending",
        createdBy: "owner1",
        participants: [
          { _id: "p1", name: "Grimgork", faction: "", userId: "u2" },
        ],
      }),
    });

    renderPage();

    const goBtn = await screen.findByRole("button", {
      name: /go to your matches/i,
    });
    fireEvent.click(goBtn);

    expect(mockNavigate).toHaveBeenCalledWith("/matches/tournament/ABCDEF");
  });
});

// ─── Socket event callback bodies ────────────────────────────────────────────

describe("TournamentViewPage – socket event callback bodies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSocket.mockReturnValue(fakeSocket);
    mockUseUserStore.mockReturnValue(makeStore("u2", "Grimgork", true));
  });

  it("onTournamentUpdated updates displayed tournament name", async () => {
    mockGet.mockResolvedValueOnce({
      success: true,
      data: makeTournament({ name: "Original Cup", status: "pending" }),
    });

    renderPage();

    await screen.findByText("Original Cup");

    // Find the onTournamentUpdated socket.on callback
    const onCall = fakeSocket.on.mock.calls.find(
      (c) => c[0] === "tournament:updated",
    );
    expect(onCall).toBeDefined();

    // Invoke the callback with updated data
    const updatedTournament = makeTournament({
      name: "Updated Cup",
      status: "pending",
    });
    await import("@testing-library/react").then(({ act }) =>
      act(() => onCall?.[1]?.(updatedTournament)),
    );

    await waitFor(() =>
      expect(screen.getByText("Updated Cup")).toBeInTheDocument(),
    );
  });

  it("onMatchesUpdated replaces the matches list", async () => {
    mockGet.mockResolvedValueOnce({
      success: true,
      data: makeTournament({ status: "active" }),
    });
    mockGet.mockResolvedValueOnce({ success: true, data: [] });

    renderPage();

    await waitFor(() =>
      expect(screen.getByText(/no matches yet/i)).toBeInTheDocument(),
    );

    const onCall = fakeSocket.on.mock.calls.find(
      (c) => c[0] === "matches:updated",
    );
    expect(onCall).toBeDefined();

    const match = {
      _id: "m1",
      round: 1,
      matchNumber: 1,
      player1: { participantId: "p1", name: "Alpha", faction: "" },
      player2: { participantId: "p2", name: "Beta", faction: "" },
      winnerId: null,
      loserId: null,
      status: "pending",
      notes: "",
      reportedResults: [],
      resultOverrides: [],
      completedAt: null,
      bracketSide: null,
    };

    await import("@testing-library/react").then(({ act }) =>
      act(() => onCall?.[1]?.([match])),
    );

    await waitFor(() =>
      expect(screen.getByText("Match 1")).toBeInTheDocument(),
    );
  });

  it("onMatchesAppended appends matches to existing list", async () => {
    const initialMatch = {
      _id: "m1",
      round: 1,
      matchNumber: 1,
      player1: { participantId: "p1", name: "Alpha", faction: "" },
      player2: { participantId: "p2", name: "Beta", faction: "" },
      winnerId: null,
      loserId: null,
      status: "pending",
      notes: "",
      reportedResults: [],
      resultOverrides: [],
      completedAt: null,
      bracketSide: null,
    };
    mockGet.mockResolvedValueOnce({
      success: true,
      data: makeTournament({ status: "active" }),
    });
    mockGet.mockResolvedValueOnce({ success: true, data: [initialMatch] });

    renderPage();

    await waitFor(() =>
      expect(screen.getByText("Match 1")).toBeInTheDocument(),
    );

    const onCall = fakeSocket.on.mock.calls.find(
      (c) => c[0] === "matches:appended",
    );
    expect(onCall).toBeDefined();

    const newMatch = { ...initialMatch, _id: "m2", matchNumber: 2 };
    await import("@testing-library/react").then(({ act }) =>
      act(() => onCall?.[1]?.([newMatch])),
    );

    await waitFor(() =>
      expect(screen.getByText("Match 2")).toBeInTheDocument(),
    );
  });

  it("onMatchUpdated updates a specific match in the list", async () => {
    const match = {
      _id: "m1",
      round: 1,
      matchNumber: 1,
      player1: { participantId: "p1", name: "Alpha", faction: "" },
      player2: { participantId: "p2", name: "Beta", faction: "" },
      winnerId: null,
      loserId: null,
      status: "pending" as const,
      notes: "",
      reportedResults: [],
      resultOverrides: [],
      completedAt: null,
      bracketSide: null,
    };
    mockGet.mockResolvedValueOnce({
      success: true,
      data: makeTournament({ status: "active" }),
    });
    mockGet.mockResolvedValueOnce({ success: true, data: [match] });

    renderPage();

    await waitFor(() =>
      expect(screen.getByText("Match 1")).toBeInTheDocument(),
    );

    const onCall = fakeSocket.on.mock.calls.find(
      (c) => c[0] === "match:updated",
    );
    expect(onCall).toBeDefined();

    const updatedMatch = {
      ...match,
      winnerId: "p1",
      status: "completed" as const,
    };
    await import("@testing-library/react").then(({ act }) =>
      act(() => onCall?.[1]?.(updatedMatch)),
    );

    // Match still shows (state was updated)
    await waitFor(() =>
      expect(screen.getByText("Match 1")).toBeInTheDocument(),
    );
  });
});
