/**
 * Branch coverage for TournamentBrowser.tsx line 109:
 *   `if (!user) return false`
 *
 * When the user store returns user=null, isAlreadyJoined returns false immediately,
 * covering the early-return branch at line 109.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { MemoryRouter } from "react-router";
import TournamentBrowser from "@/features/tournaments/components/TournamentBrowser";

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock("@/core/api/httpClient", () => ({
  httpClient: { get: vi.fn() },
}));

vi.mock("@/shared/stores/userStore", () => ({
  useUserStore: vi.fn(),
}));

import { httpClient } from "@/core/api/httpClient";
import { useUserStore, type UserStore } from "@/shared/stores/userStore";

const mockGet = vi.mocked(httpClient.get);

function renderBrowser() {
  return render(
    <ChakraProvider value={defaultSystem}>
      <MemoryRouter>
        <TournamentBrowser
          statusFilter="active"
          emptyMessage="No tournaments."
        />
      </MemoryRouter>
    </ChakraProvider>,
  );
}

describe("TournamentBrowser – null user branch (line 109)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("isAlreadyJoined returns false when user is null (line 109 true branch)", async () => {
    vi.mocked(useUserStore as unknown as () => UserStore).mockReturnValue({
      user: null as unknown as UserStore["user"],
      isAuthenticated: vi.fn().mockReturnValue(false),
    } as unknown as UserStore);

    mockGet.mockResolvedValue({
      success: true,
      data: [
        {
          _id: "t-null",
          name: "Null User Cup",
          description: "",
          playerCount: 4,
          tournamentType: "Round Robin",
          bannedFactions: [],
          participants: [{ _id: "p1", name: "OtherPlayer", faction: "Empire" }],
          status: "active",
          createdAt: new Date().toISOString(),
        },
      ],
    });

    renderBrowser();

    // Tournament should render; with user=null, isAlreadyJoined returns false → Join button shown
    await waitFor(() => {
      expect(screen.getByText("Null User Cup")).toBeInTheDocument();
    });

    // Spectate button confirms isAlreadyJoined returned false (joined=false → shows Spectate, not My Matches)
    expect(
      screen.getByRole("button", { name: /spectate/i }),
    ).toBeInTheDocument();
  });

  it("isAlreadyJoined returns false and no crash when user is null with no participants", async () => {
    vi.mocked(useUserStore as unknown as () => UserStore).mockReturnValue({
      user: null as unknown as UserStore["user"],
      isAuthenticated: vi.fn().mockReturnValue(false),
    } as unknown as UserStore);

    mockGet.mockResolvedValue({
      success: true,
      data: [
        {
          _id: "t-empty",
          name: "Empty Cup",
          description: "",
          playerCount: 4,
          tournamentType: "Round Robin",
          bannedFactions: [],
          participants: [],
          status: "active",
          createdAt: new Date().toISOString(),
        },
      ],
    });

    renderBrowser();

    await waitFor(() => {
      expect(screen.getByText("Empty Cup")).toBeInTheDocument();
    });
  });
});
