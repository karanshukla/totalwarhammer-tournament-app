/**
 * Branch coverage for TournamentBrowser.tsx:
 * - Line 113: participant with userId matching user id
 * - Line 252: "Participated" badge (joined user + completed tournament)
 * - Line 270: Join button navigate fallback (no t.code → /tournament/:id)
 * - Line 297: My Matches button navigate fallback (no t.code → /matches#:id)
 * - Lines 308-313: Spectate button navigate fallback (no t.code → /tournament/:id)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { MemoryRouter } from "react-router-dom";
import TournamentBrowser from "@/features/tournaments/components/TournamentBrowser";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("@/core/api/httpClient", () => ({
  httpClient: { get: vi.fn() },
}));

vi.mock("@/shared/stores/userStore", () => ({
  useUserStore: vi.fn(),
}));

import { httpClient } from "@/core/api/httpClient";
import { useUserStore } from "@/shared/stores/userStore";

const mockGet = vi.mocked(httpClient.get);
const mockUseUserStore = vi.mocked(
  useUserStore as unknown as () => ReturnType<typeof useUserStore>,
);

function makeUser(overrides = {}) {
  return {
    user: { id: "u1", username: "testuser", isAuthenticated: true, isGuest: false },
    isAuthenticated: vi.fn().mockReturnValue(true),
    ...overrides,
  };
}

function makeTournament(overrides: Record<string, unknown> = {}) {
  return {
    _id: "t1",
    name: "Test Cup",
    description: "",
    playerCount: 8,
    tournamentType: "Single Elimination",
    bannedFactions: [],
    enable40kFactions: false,
    participants: [] as { _id: string; name: string; faction: string; userId?: string }[],
    status: "pending",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function renderBrowser(props: { statusFilter?: string; emptyMessage?: string } = {}) {
  return render(
    <ChakraProvider value={defaultSystem}>
      <MemoryRouter>
        <TournamentBrowser
          statusFilter={(props.statusFilter as "pending") ?? "pending"}
          emptyMessage={props.emptyMessage ?? "No tournaments."}
        />
      </MemoryRouter>
    </ChakraProvider>,
  );
}

describe("TournamentBrowser – branch coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (mockUseUserStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(makeUser());
  });

  it("shows 'Participated' badge when user joined a completed tournament", async () => {
    (mockUseUserStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      makeUser({
        user: { id: "u1", username: "testuser", isAuthenticated: true },
      }),
    );
    mockGet.mockResolvedValue({
      success: true,
      data: [
        makeTournament({
          status: "completed",
          participants: [{ _id: "p1", name: "testuser", faction: "Empire" }],
        }),
      ],
    });
    renderBrowser({ statusFilter: "completed" });
    await waitFor(() =>
      expect(screen.getByText(/participated/i)).toBeInTheDocument(),
    );
  });

  it("matches participant via userId property when present", async () => {
    // This covers line 113: if (p.userId) return p.userId === uid;
    (mockUseUserStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      makeUser({
        user: { id: "user-uid-123", username: "testuser", isAuthenticated: true },
      }),
    );
    mockGet.mockResolvedValue({
      success: true,
      data: [
        makeTournament({
          status: "pending",
          participants: [
            { _id: "p1", name: "some-name", faction: "Empire", userId: "user-uid-123" },
          ],
        }),
      ],
    });
    renderBrowser({ statusFilter: "pending" });
    // When userId matches, the user is considered joined → "Joined" badge shown
    await waitFor(() =>
      expect(screen.getByText(/joined/i)).toBeInTheDocument(),
    );
  });

  it("Join Tournament button navigates to /tournament/:id when no code", async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValue({
      success: true,
      data: [
        // No code → fallback navigate to /tournament/:id
        makeTournament({ _id: "tourney1", status: "pending", participants: [] }),
      ],
    });
    renderBrowser({ statusFilter: "pending" });
    await waitFor(() => screen.getByRole("button", { name: /join tournament/i }));
    await user.click(screen.getByRole("button", { name: /join tournament/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/tournament/tourney1");
  });

  it("My Matches button navigates to /matches#:id when no code (line 297)", async () => {
    const user = userEvent.setup();
    (mockUseUserStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      makeUser({
        user: { id: "u1", username: "testuser", isAuthenticated: true },
      }),
    );
    mockGet.mockResolvedValue({
      success: true,
      data: [
        // No code → fallback navigate to /matches#:id
        makeTournament({
          _id: "myMatchesTourney",
          status: "pending",
          participants: [{ _id: "p1", name: "testuser", faction: "Empire" }],
        }),
      ],
    });
    renderBrowser({ statusFilter: "pending" });
    await waitFor(() => screen.getByRole("button", { name: /my matches/i }));
    await user.click(screen.getByRole("button", { name: /my matches/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/matches#myMatchesTourney");
  });

  it("Spectate button navigates to /tournament/:id when no code (lines 308-313)", async () => {
    const user = userEvent.setup();
    (mockUseUserStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { id: "", username: "", isAuthenticated: false },
      isAuthenticated: vi.fn().mockReturnValue(false),
    });
    mockGet.mockResolvedValue({
      success: true,
      data: [
        makeTournament({
          _id: "spectateId",
          status: "active",
          playerCount: 8,
          participants: [],
        }),
      ],
    });
    renderBrowser({ statusFilter: "active" });
    await waitFor(() => screen.getByRole("button", { name: /spectate/i }));
    await user.click(screen.getByRole("button", { name: /spectate/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/tournament/spectateId");
  });
});
