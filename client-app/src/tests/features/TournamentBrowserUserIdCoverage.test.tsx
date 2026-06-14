/**
 * Branch coverage for TournamentBrowser.tsx line 113:
 *   `if (p.userId) return p.userId === uid`
 *
 * True branch: participant has a userId property → match by userId === user.id.
 * Also covers line 111: `user.username || uid` — when username is absent, uid is used.
 *
 * Existing tests only match participants by name. This test provides a participant
 * with a `userId` field matching the current user's id, triggering the userId branch.
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
  useUserStore: vi.fn(),
}));

import { httpClient } from "@/core/api/httpClient";
import { useUserStore } from "@/shared/stores/userStore";

const mockGet = vi.mocked(httpClient.get);
const mockUseUserStore = vi.mocked(
  useUserStore as unknown as () => ReturnType<typeof useUserStore>,
);

function renderBrowser(statusFilter: string = "pending") {
  return render(
    <ChakraProvider value={defaultSystem}>
      <MemoryRouter>
        <TournamentBrowser
          statusFilter={statusFilter as "pending"}
          emptyMessage="No tournaments."
        />
      </MemoryRouter>
    </ChakraProvider>,
  );
}

describe("TournamentBrowser – userId matching (line 113 true branch)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("isAlreadyJoined returns true when participant.userId matches user.id (line 113 true branch)", async () => {
    mockUseUserStore.mockReturnValue({
      user: {
        id: "uid-abc",
        email: "test@test.com",
        username: "TestPlayer",
        isAuthenticated: true,
        isGuest: false,
      },
      isAuthenticated: vi.fn().mockReturnValue(true),
    } as ReturnType<typeof useUserStore>);

    mockGet.mockResolvedValueOnce({
      success: true,
      data: [
        {
          _id: "t-uid",
          name: "UserId Cup",
          description: "",
          playerCount: 8,
          tournamentType: "Single Elimination",
          bannedFactions: [],
          participants: [
            {
              _id: "p1",
              userId: "uid-abc",
              name: "SomeOtherName",
              faction: "Empire",
            },
          ],
          status: "pending",
          createdAt: new Date().toISOString(),
        },
      ],
    });

    renderBrowser("pending");

    await waitFor(() => {
      expect(screen.getByText("UserId Cup")).toBeInTheDocument();
    });

    // Joined badge should appear because userId matched → isAlreadyJoined = true
    expect(screen.getByText("Joined")).toBeInTheDocument();

    // My Matches button confirms joined=true path
    expect(
      screen.getByRole("button", { name: /my matches/i }),
    ).toBeInTheDocument();
  });

  it("isAlreadyJoined returns false when participant.userId does NOT match user.id (line 113 true branch, false result)", async () => {
    mockUseUserStore.mockReturnValue({
      user: {
        id: "uid-abc",
        email: "test@test.com",
        username: "TestPlayer",
        isAuthenticated: true,
        isGuest: false,
      },
      isAuthenticated: vi.fn().mockReturnValue(true),
    } as ReturnType<typeof useUserStore>);

    mockGet.mockResolvedValueOnce({
      success: true,
      data: [
        {
          _id: "t-uid2",
          name: "Other Cup",
          description: "",
          playerCount: 8,
          tournamentType: "Single Elimination",
          bannedFactions: [],
          participants: [
            {
              _id: "p2",
              userId: "uid-DIFFERENT",
              name: "SomePlayer",
              faction: "Dwarfs",
            },
          ],
          status: "pending",
          createdAt: new Date().toISOString(),
        },
      ],
    });

    renderBrowser("pending");

    await waitFor(() => {
      expect(screen.getByText("Other Cup")).toBeInTheDocument();
    });

    // Not joined — Spectate button should appear instead
    expect(
      screen.getByRole("button", { name: /spectate/i }),
    ).toBeInTheDocument();
  });

  it("isAlreadyJoined uses uid as name fallback when username is absent (line 111 false branch)", async () => {
    mockUseUserStore.mockReturnValue({
      user: {
        id: "uid-xyz",
        email: "guest@test.com",
        username: undefined,
        isAuthenticated: true,
        isGuest: false,
      },
      isAuthenticated: vi.fn().mockReturnValue(true),
    } as ReturnType<typeof useUserStore>);

    mockGet.mockResolvedValueOnce({
      success: true,
      data: [
        {
          _id: "t-noname",
          name: "No Username Cup",
          description: "",
          playerCount: 4,
          tournamentType: "Round Robin",
          bannedFactions: [],
          participants: [
            {
              _id: "p3",
              name: "uid-xyz",
              faction: "Empire",
            },
          ],
          status: "pending",
          createdAt: new Date().toISOString(),
        },
      ],
    });

    renderBrowser("pending");

    await waitFor(() => {
      expect(screen.getByText("No Username Cup")).toBeInTheDocument();
    });

    // Matched by uid (used as name because username is absent)
    expect(screen.getByText("Joined")).toBeInTheDocument();
  });
});
