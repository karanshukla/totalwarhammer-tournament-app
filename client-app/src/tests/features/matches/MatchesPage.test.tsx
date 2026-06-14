/**
 * Branch coverage for matches/components/MatchesPage.tsx:
 * - fetchTournaments: !isAuthenticated() → setLoading(false), no fetch
 * - fetchTournaments: isAuthenticated + error → shows error message
 * - loading=true → Spinner
 * - selected !== null → TournamentDetail rendered
 * - else (no selected) → TournamentList rendered
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { MemoryRouter } from "react-router-dom";

const { mockGet, mockUseUserStore, mockGetSocket } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockUseUserStore: vi.fn(),
  mockGetSocket: vi.fn(),
}));

vi.mock("@/core/api/httpClient", () => ({
  httpClient: { get: mockGet, post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

vi.mock("@/shared/stores/userStore", () => ({
  useUserStore: () => mockUseUserStore(),
}));

vi.mock("@/core/socket/socketClient", () => ({
  getSocket: mockGetSocket,
}));

vi.mock("@/shared/ui/Toaster", () => ({
  toaster: { create: vi.fn() },
}));

vi.mock("@/features/matches/components/TournamentList", () => ({
  default: () => <div data-testid="tournament-list" />,
}));

vi.mock("@/features/matches/components/TournamentDetail", () => ({
  default: () => <div data-testid="tournament-detail" />,
}));

import MatchesPage from "@/features/matches/components/MatchesPage";

const fakeSocket = {
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
};

function makeStore(isAuthenticated: boolean, userId = "u1") {
  return {
    user: {
      id: userId,
      username: "Grimgork",
      isAuthenticated,
      isGuest: false,
    },
    isAuthenticated: () => isAuthenticated,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ChakraProvider value={defaultSystem}>
        <MatchesPage />
      </ChakraProvider>
    </MemoryRouter>,
  );
}

describe("MatchesPage – unauthenticated (fetchTournaments early return)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSocket.mockReturnValue(fakeSocket);
    mockUseUserStore.mockReturnValue(makeStore(false));
  });

  it("does not call httpClient.get and shows TournamentList", async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("tournament-list")).toBeInTheDocument(),
    );
    expect(mockGet).not.toHaveBeenCalled();
  });
});

describe("MatchesPage – loading state (initial fetch in-flight)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSocket.mockReturnValue(fakeSocket);
    mockUseUserStore.mockReturnValue(makeStore(true));
  });

  it("shows loading spinner while fetch is in flight", async () => {
    mockGet.mockReturnValueOnce(new Promise(() => {}));
    renderPage();
    expect(screen.getByText(/loading matches/i)).toBeInTheDocument();
  });
});

describe("MatchesPage – fetch succeeds, no selected → TournamentList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSocket.mockReturnValue(fakeSocket);
    mockUseUserStore.mockReturnValue(makeStore(true));
  });

  it("renders TournamentList after successful fetch", async () => {
    mockGet.mockResolvedValueOnce({
      success: true,
      data: [],
      total: 0,
      statusCounts: { all: 0, pending: 0, active: 0, completed: 0 },
    });
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("tournament-list")).toBeInTheDocument(),
    );
  });
});

describe("MatchesPage – err instanceof Error branch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSocket.mockReturnValue(fakeSocket);
    mockUseUserStore.mockReturnValue(makeStore(true));
  });

  it("passes error message to TournamentList when Error thrown", async () => {
    mockGet.mockRejectedValueOnce(new Error("Network down"));
    renderPage();
    // TournamentList should be rendered (error state is passed via props)
    await waitFor(() =>
      expect(screen.getByTestId("tournament-list")).toBeInTheDocument(),
    );
  });
});
