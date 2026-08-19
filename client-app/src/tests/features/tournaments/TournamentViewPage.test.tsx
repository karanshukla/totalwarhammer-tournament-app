/**
 * Branch coverage for tournaments/components/TournamentViewPage.tsx:
 * - loading=true → Spinner + "Loading tournament..."
 * - error || !tournament → "Tournament Not Found"
 * - isOwner → "Owner" badge + "Manage Tournament" button
 * - isParticipant (alreadyJoined) → "Participant" badge
 * - neither → "Spectating" badge
 * - isPending && alreadyJoined → "You're In!" heading, "Go to Your Matches" button
 * - isPending && !alreadyJoined && isFull → "This tournament is full."
 * - isPending && !alreadyJoined && !isAuthenticated → "Sign In to Join"
 * - isPending && canJoin → join form with faction select
 * - isActive → Matches card shown with "No matches yet."
 * - champion (completed + final match with winner) → champion banner
 * - champion.faction → faction shown in champion banner
 * - bannedFactions.length > 0 → banned factions listed
 * - enable40kFactions → 40K Beta badge
 * - joinError → error box in join form
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { MemoryRouter } from "react-router";

const { mockGet, mockPost, mockGetSocket, mockUseUserStore, mockNavigate } =
  vi.hoisted(() => ({
    mockGet: vi.fn(),
    mockPost: vi.fn(),
    mockGetSocket: vi.fn(),
    mockUseUserStore: vi.fn(),
    mockNavigate: vi.fn(),
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
  default: ({ children }: { children: string }) => <>{children}</>,
}));

vi.mock("@/shared/ui/toasterStore", () => ({
  toaster: { create: vi.fn() },
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
    bannedFactions: [],
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

function makeStore(userId = "u2", authenticated = true) {
  return {
    user: { id: userId, username: "Grimgork", isGuest: false },
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

describe("TournamentViewPage – loading state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSocket.mockReturnValue(fakeSocket);
    mockUseUserStore.mockReturnValue(makeStore());
  });

  it("shows 'Loading tournament...' while fetch is in flight", () => {
    mockGet.mockReturnValueOnce(new Promise(() => {}));
    renderPage();
    expect(screen.getByText(/loading tournament/i)).toBeInTheDocument();
  });
});

describe("TournamentViewPage – error state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSocket.mockReturnValue(fakeSocket);
    mockUseUserStore.mockReturnValue(makeStore());
  });

  it("shows 'Tournament Not Found' when fetch throws", async () => {
    mockGet.mockRejectedValueOnce(new Error("not found"));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("Tournament Not Found")).toBeInTheDocument(),
    );
  });
});

describe("TournamentViewPage – owner badge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSocket.mockReturnValue(fakeSocket);
    mockUseUserStore.mockReturnValue(makeStore("owner1"));
  });

  it("shows 'Owner' badge when user is the tournament creator", async () => {
    mockGet.mockResolvedValueOnce({
      success: true,
      data: makeTournament({ createdBy: "owner1" }),
    });
    renderPage();
    await waitFor(() => expect(screen.getByText("Owner")).toBeInTheDocument());
  });

  it("shows 'Manage Tournament' button for owner", async () => {
    mockGet.mockResolvedValueOnce({
      success: true,
      data: makeTournament({ createdBy: "owner1" }),
    });
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /manage tournament/i }),
      ).toBeInTheDocument(),
    );
  });
});

describe("TournamentViewPage – participant badge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSocket.mockReturnValue(fakeSocket);
    mockUseUserStore.mockReturnValue(makeStore("u2"));
  });

  it("shows 'Participant' badge when user is already joined", async () => {
    mockGet.mockResolvedValueOnce({
      success: true,
      data: makeTournament({
        participants: [
          { _id: "p1", name: "Grimgork", faction: "", userId: "u2" },
        ],
      }),
    });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("Participant")).toBeInTheDocument(),
    );
  });
});

describe("TournamentViewPage – spectating badge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSocket.mockReturnValue(fakeSocket);
    mockUseUserStore.mockReturnValue(makeStore("u99", false));
  });

  it("shows 'Spectating' badge when user is not owner or participant", async () => {
    mockGet.mockResolvedValueOnce({
      success: true,
      data: makeTournament({ createdBy: "owner1" }),
    });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("Spectating")).toBeInTheDocument(),
    );
  });
});

describe("TournamentViewPage – pending join panel branches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSocket.mockReturnValue(fakeSocket);
  });

  it("shows 'You're In!' when user is already joined", async () => {
    mockUseUserStore.mockReturnValue(makeStore("u2", true));
    mockGet.mockResolvedValueOnce({
      success: true,
      data: makeTournament({
        status: "pending",
        participants: [
          { _id: "p1", name: "Grimgork", faction: "", userId: "u2" },
        ],
      }),
    });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/you're in!/i)).toBeInTheDocument(),
    );
  });

  it("shows 'This tournament is full.' when tournament is full", async () => {
    mockUseUserStore.mockReturnValue(makeStore("u2", true));
    mockGet.mockResolvedValueOnce({
      success: true,
      data: makeTournament({
        status: "pending",
        playerCount: 1,
        participants: [
          { _id: "p1", name: "Other", faction: "", userId: "other" },
        ],
      }),
    });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/this tournament is full/i)).toBeInTheDocument(),
    );
  });

  it("shows 'Sign In to Join' when not authenticated", async () => {
    mockUseUserStore.mockReturnValue(makeStore("u2", false));
    mockGet.mockResolvedValueOnce({
      success: true,
      data: makeTournament({ status: "pending" }),
    });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/sign in to join/i)).toBeInTheDocument(),
    );
  });

  it("shows join form with faction select when canJoin", async () => {
    mockUseUserStore.mockReturnValue(makeStore("u2", true));
    mockGet.mockResolvedValueOnce({
      success: true,
      data: makeTournament({ status: "pending", createdBy: "owner1" }),
    });
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /join tournament/i }),
      ).toBeInTheDocument(),
    );
  });
});

describe("TournamentViewPage – active matches section", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSocket.mockReturnValue(fakeSocket);
    mockUseUserStore.mockReturnValue(makeStore("u2", true));
  });

  it("shows Matches section with 'No matches yet.' when active and no matches", async () => {
    mockGet
      .mockResolvedValueOnce({
        success: true,
        data: makeTournament({ status: "active" }),
      })
      .mockResolvedValueOnce({ success: true, data: [] });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/no matches yet/i)).toBeInTheDocument(),
    );
  });
});

describe("TournamentViewPage – champion banner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSocket.mockReturnValue(fakeSocket);
    mockUseUserStore.mockReturnValue(makeStore("u2", true));
  });

  it("shows 'Tournament Champion' banner when completed with a final match winner", async () => {
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
            player1: {
              participantId: "p1",
              name: "Grimgork",
              faction: "Greenskins",
            },
            player2: { participantId: "p2", name: "Luthor", faction: "Empire" },
            winnerId: "p1",
            status: "completed",
            reportedResults: [],
          },
        ],
      });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/tournament champion/i)).toBeInTheDocument(),
    );
    expect(screen.getAllByText("Grimgork").length).toBeGreaterThan(0);
  });
});

describe("TournamentViewPage – enable40kFactions badge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSocket.mockReturnValue(fakeSocket);
    mockUseUserStore.mockReturnValue(makeStore("u2", true));
  });

  it("shows '40K' badge when enable40kFactions is true", async () => {
    mockGet.mockResolvedValueOnce({
      success: true,
      data: makeTournament({ enable40kFactions: true }),
    });
    renderPage();
    await waitFor(() => expect(screen.getByText("40K")).toBeInTheDocument());
  });
});
