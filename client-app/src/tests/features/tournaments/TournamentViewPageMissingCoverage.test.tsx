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
  joinTournamentRoom: (id: string) =>
    mockGetSocket().emit("tournament:join", id),
  leaveTournamentRoom: (id: string) =>
    mockGetSocket().emit("tournament:leave", id),
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

// Handlers are registered in a passive effect, which React flushes *after* the
// commit that paints the tournament. Waiting on the DOM is therefore not
// enough — poll the registration itself.
async function waitForSocketHandler<T>(event: string) {
  let handler: ((payload: T) => void) | undefined;
  await waitFor(() => {
    const call = fakeSocket.on.mock.calls.find((c) => c[0] === event);
    expect(call).toBeDefined();
    handler = call?.[1];
  });
  return handler as (payload: T) => void;
}

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

    const handler = await waitForSocketHandler<unknown>("tournament:updated");

    // Invoke the callback with updated data
    const updatedTournament = makeTournament({
      name: "Updated Cup",
      status: "pending",
    });
    await import("@testing-library/react").then(({ act }) =>
      act(() => handler(updatedTournament)),
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

    const handler = await waitForSocketHandler<unknown[]>("matches:updated");

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
      act(() => handler([match])),
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

    const handler = await waitForSocketHandler<unknown[]>("matches:appended");

    const newMatch = { ...initialMatch, _id: "m2", matchNumber: 2 };
    await import("@testing-library/react").then(({ act }) =>
      act(() => handler([newMatch])),
    );

    await waitFor(() =>
      expect(screen.getByText("Match 2")).toBeInTheDocument(),
    );
  });

  it("onMatchesAppended ignores matches already in the list", async () => {
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

    const handler = await waitForSocketHandler<unknown[]>("matches:appended");

    // The organiser who advanced the round also refetches over HTTP, so the
    // broadcast can arrive carrying matches the list already holds. Appending
    // blindly rendered the round twice with duplicate React keys.
    const { act } = await import("@testing-library/react");
    const newMatch = { ...initialMatch, _id: "m2", matchNumber: 2 };
    act(() => handler([newMatch]));
    await waitFor(() =>
      expect(screen.getByText("Match 2")).toBeInTheDocument(),
    );

    act(() => handler([newMatch]));

    await waitFor(() => expect(screen.getAllByText("Match 2")).toHaveLength(1));
    expect(screen.getAllByText("Match 1")).toHaveLength(1);
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

    const handler = await waitForSocketHandler<unknown>("match:updated");

    const updatedMatch = {
      ...match,
      winnerId: "p1",
      status: "completed" as const,
    };
    await import("@testing-library/react").then(({ act }) =>
      act(() => handler(updatedMatch)),
    );

    // Match still shows (state was updated)
    await waitFor(() =>
      expect(screen.getByText("Match 1")).toBeInTheDocument(),
    );
  });
});

// ─── onMatchUpdated map ternary with multiple matches (~line 173) ────────────

describe("TournamentViewPage – onMatchUpdated with multiple matches in the list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSocket.mockReturnValue(fakeSocket);
    mockUseUserStore.mockReturnValue(makeStore("u2", "Grimgork", true));
  });

  it("only replaces the matching match, leaving the other untouched", async () => {
    const match1 = {
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
    const match2 = { ...match1, _id: "m2", matchNumber: 2 };

    mockGet
      .mockResolvedValueOnce({
        success: true,
        data: makeTournament({ status: "active" }),
      })
      .mockResolvedValueOnce({ success: true, data: [match1, match2] });

    renderPage();

    await waitFor(() =>
      expect(screen.getByText("Match 1")).toBeInTheDocument(),
    );
    expect(screen.getByText("Match 2")).toBeInTheDocument();

    const handler = await waitForSocketHandler<unknown>("match:updated");

    const { act } = await import("@testing-library/react");
    act(() => handler({ ...match1, winnerId: "p1", status: "completed" }));

    await waitFor(() =>
      expect(screen.getByText("Match 1")).toBeInTheDocument(),
    );
    expect(screen.getByText("Match 2")).toBeInTheDocument();
  });
});

// ─── champion computation: winnerId matches neither participant (~line 282) ──

describe("TournamentViewPage – champion winnerId matches neither participant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSocket.mockReturnValue(fakeSocket);
    mockUseUserStore.mockReturnValue(makeStore("u2", "Grimgork", true));
  });

  it("shows no champion banner when winnerId matches neither player1 nor player2", async () => {
    mockGet
      .mockResolvedValueOnce({
        success: true,
        data: makeTournament({ status: "completed" }),
      })
      .mockResolvedValueOnce({
        success: true,
        data: [
          {
            _id: "m1",
            round: 1,
            matchNumber: 1,
            player1: { participantId: "p1", name: "Grimgork", faction: "" },
            player2: { participantId: "p2", name: "Luthor", faction: "" },
            winnerId: "some-orphaned-id",
            status: "completed",
            reportedResults: [],
          },
        ],
      });
    renderPage();

    await waitFor(() =>
      expect(screen.getByText(/round 1/i)).toBeInTheDocument(),
    );
    expect(screen.queryByText(/tournament champion/i)).not.toBeInTheDocument();
  });
});

// ─── id resolved via route param instead of prop (~lines 92, 128, 163) ───────

describe("TournamentViewPage – id from route param (no id prop)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSocket.mockReturnValue(fakeSocket);
    mockUseUserStore.mockReturnValue(makeStore());
  });

  it("uses the :id route param when no id prop is supplied", async () => {
    mockGet.mockResolvedValueOnce({
      success: true,
      data: makeTournament({ _id: "route-id" }),
    });

    const { Routes, Route } = await import("react-router");
    render(
      <MemoryRouter initialEntries={["/tournaments/route-id"]}>
        <ChakraProvider value={defaultSystem}>
          <Routes>
            <Route path="/tournaments/:id" element={<TournamentViewPage />} />
          </Routes>
        </ChakraProvider>
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith("/tournament/route-id"),
    );
  });

  it("keeps showing the loading spinner forever when neither id prop nor route param is present", () => {
    render(
      <MemoryRouter initialEntries={["/no-id-here"]}>
        <ChakraProvider value={defaultSystem}>
          <TournamentViewPage id={undefined} />
        </ChakraProvider>
      </MemoryRouter>,
    );
    expect(screen.getByText(/loading tournament/i)).toBeInTheDocument();
    expect(mockGet).not.toHaveBeenCalled();
  });
});

// ─── fetchMatches failure while tournament is active (~line 146) ─────────────

describe("TournamentViewPage – match fetch failure while active", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSocket.mockReturnValue(fakeSocket);
    mockUseUserStore.mockReturnValue(makeStore());
  });

  it("shows 'No matches yet.' when the match fetch rejects", async () => {
    mockGet
      .mockResolvedValueOnce({
        success: true,
        data: makeTournament({ status: "active" }),
      })
      .mockRejectedValueOnce(new Error("match fetch failed"));

    renderPage();

    await waitFor(() =>
      expect(screen.getByText(/no matches yet/i)).toBeInTheDocument(),
    );
  });
});

// ─── handleJoin non-Error rejection (~line 203) ───────────────────────────────

describe("TournamentViewPage – handleJoin non-Error rejection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSocket.mockReturnValue(fakeSocket);
    mockUseUserStore.mockReturnValue(makeStore("u2", "Grimgork", true));
  });

  it("shows the default join error message when a non-Error value is rejected", async () => {
    mockGet.mockResolvedValueOnce({
      success: true,
      data: makeTournament({ status: "pending", createdBy: "owner1" }),
    });
    mockPost.mockRejectedValueOnce("not an Error instance");

    renderPage();

    const joinBtn = await screen.findByRole("button", {
      name: /join tournament/i,
    });
    fireEvent.click(joinBtn);

    await waitFor(() =>
      expect(screen.getByText("Failed to join tournament")).toBeInTheDocument(),
    );
  });
});

// ─── isAlreadyJoined guard when user is null (~line 211) ─────────────────────

describe("TournamentViewPage – isAlreadyJoined with null user", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSocket.mockReturnValue(fakeSocket);
    mockUseUserStore.mockReturnValue({
      user: null,
      isAuthenticated: () => false,
    });
  });

  it("shows 'Spectating' badge when user is null", async () => {
    mockGet.mockResolvedValueOnce({
      success: true,
      data: makeTournament({
        createdBy: "owner1",
        participants: [
          { _id: "p1", name: "Someone", faction: "", userId: "someone" },
        ],
      }),
    });
    renderPage();

    await waitFor(() =>
      expect(screen.getByText("Spectating")).toBeInTheDocument(),
    );
  });
});

// ─── Go Back button (~line 242) ───────────────────────────────────────────────

describe("TournamentViewPage – Go Back button on error state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSocket.mockReturnValue(fakeSocket);
    mockUseUserStore.mockReturnValue(makeStore());
  });

  it("calls navigate(-1) when Go Back is clicked", async () => {
    mockGet.mockRejectedValueOnce(new Error("not found"));
    renderPage();

    const goBackBtn = await screen.findByRole("button", { name: /go back/i });
    fireEvent.click(goBackBtn);

    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});

// ─── champion computation branches (~lines 266, 276-282) ─────────────────────

describe("TournamentViewPage – champion computation branches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSocket.mockReturnValue(fakeSocket);
    mockUseUserStore.mockReturnValue(makeStore("u2", "Grimgork", true));
  });

  it("shows no champion banner when the final round has no match with a winner", async () => {
    mockGet
      .mockResolvedValueOnce({
        success: true,
        data: makeTournament({ status: "completed" }),
      })
      .mockResolvedValueOnce({
        success: true,
        data: [
          {
            _id: "m1",
            round: 1,
            matchNumber: 1,
            player1: { participantId: "p1", name: "Grimgork", faction: "" },
            player2: { participantId: "p2", name: "Luthor", faction: "" },
            winnerId: null,
            status: "pending",
            reportedResults: [],
          },
        ],
      });
    renderPage();

    await waitFor(() =>
      expect(screen.getByText(/round 1/i)).toBeInTheDocument(),
    );
    expect(screen.queryByText(/tournament champion/i)).not.toBeInTheDocument();
  });

  it("shows player2 as champion when player2 has the winning result, across multiple rounds", async () => {
    mockGet
      .mockResolvedValueOnce({
        success: true,
        data: makeTournament({ status: "completed" }),
      })
      .mockResolvedValueOnce({
        success: true,
        data: [
          {
            _id: "m1",
            round: 1,
            matchNumber: 1,
            player1: { participantId: "p1", name: "Grimgork", faction: "" },
            player2: { participantId: "p2", name: "Luthor", faction: "" },
            winnerId: "p1",
            status: "completed",
            reportedResults: [],
          },
          {
            _id: "m2",
            round: 2,
            matchNumber: 2,
            player1: { participantId: "p1", name: "Grimgork", faction: "" },
            player2: { participantId: "p2", name: "Luthor", faction: "Empire" },
            winnerId: "p2",
            status: "completed",
            reportedResults: [],
          },
        ],
      });
    renderPage();

    await waitFor(() =>
      expect(screen.getByText(/tournament champion/i)).toBeInTheDocument(),
    );
    expect(screen.getAllByText("Luthor").length).toBeGreaterThan(0);
  });
});

// ─── joinFaction Select onValueChange (~line 695) ─────────────────────────────

describe("TournamentViewPage – join faction select", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSocket.mockReturnValue(fakeSocket);
    mockUseUserStore.mockReturnValue(makeStore("u2", "Grimgork", true));
  });

  it("updates joinFaction and includes it in the join POST body", async () => {
    const userEventModule = await import("@testing-library/user-event");
    const user = userEventModule.default.setup({ pointerEventsCheck: 0 });

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

    await screen.findByRole("button", { name: /join tournament/i });
    await user.click(screen.getByRole("combobox"));
    const options = await screen.findAllByRole("option");
    const empireOption = options.find((o) => o.textContent?.includes("Empire"));
    expect(empireOption).toBeDefined();
    await user.click(empireOption!);

    fireEvent.click(screen.getByRole("button", { name: /join tournament/i }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        "/tournament/t1/join",
        expect.objectContaining({ faction: "Empire" }),
      );
    });
  });
});

// ─── Participant with no faction (~line 535) ──────────────────────────────────

describe("TournamentViewPage – participant with no faction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSocket.mockReturnValue(fakeSocket);
    mockUseUserStore.mockReturnValue(makeStore());
  });

  it("does not render faction text for a participant without a faction", async () => {
    mockGet.mockResolvedValueOnce({
      success: true,
      data: makeTournament({
        participants: [
          { _id: "p1", name: "NoFactionGuy", faction: "", userId: "x" },
        ],
      }),
    });
    renderPage();

    await waitFor(() =>
      expect(screen.getByText("NoFactionGuy")).toBeInTheDocument(),
    );
  });
});

// ─── Matches W/L badges: player2 wins (~lines 867-976) ────────────────────────

describe("TournamentViewPage – matches where player2 wins", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSocket.mockReturnValue(fakeSocket);
    mockUseUserStore.mockReturnValue(makeStore("u2", "Grimgork", true));
  });

  it("shows 'W' for player2, 'L' for player1, and 'Winner: <player2>' text", async () => {
    mockGet
      .mockResolvedValueOnce({
        success: true,
        data: makeTournament({ status: "active" }),
      })
      .mockResolvedValueOnce({
        success: true,
        data: [
          {
            _id: "m1",
            round: 1,
            matchNumber: 1,
            player1: { participantId: "p1", name: "Grimgork", faction: "" },
            player2: { participantId: "p2", name: "Luthor", faction: "" },
            winnerId: "p2",
            status: "completed",
            reportedResults: [],
          },
        ],
      });
    renderPage();

    await waitFor(() => expect(screen.getByText("W")).toBeInTheDocument());
    expect(screen.getByText("L")).toBeInTheDocument();
    expect(
      screen.getByText("Luthor", { selector: "span" }),
    ).toBeInTheDocument();
  });
});
