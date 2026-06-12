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
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );
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
    user: {
      id: "u1",
      username: "testuser",
      isAuthenticated: true,
      isGuest: false,
    },
    isAuthenticated: vi.fn().mockReturnValue(true),
    ...overrides,
  };
}

function makeTournament(overrides = {}) {
  return {
    _id: "t1",
    name: "Grand Cup",
    description: "",
    playerCount: 8,
    tournamentType: "Single Elimination",
    bannedFactions: [],
    enable40kFactions: false,
    participants: [],
    status: "pending",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function renderBrowser(
  props: {
    statusFilter?:
      | "pending"
      | "active"
      | "completed"
      | ("pending" | "active" | "completed")[];
    emptyMessage?: string;
  } = {},
) {
  return render(
    <ChakraProvider value={defaultSystem}>
      <MemoryRouter>
        <TournamentBrowser
          statusFilter={props.statusFilter ?? "pending"}
          emptyMessage={props.emptyMessage ?? "No tournaments."}
        />
      </MemoryRouter>
    </ChakraProvider>,
  );
}

describe("TournamentBrowser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (mockUseUserStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      makeUser(),
    );
  });

  it("shows spinner while loading", () => {
    mockGet.mockImplementation(() => new Promise(() => {}));
    renderBrowser();
    expect(screen.getByText(/loading tournaments/i)).toBeInTheDocument();
  });

  it("shows error message when fetch fails", async () => {
    mockGet.mockRejectedValue(new Error("Network error"));
    renderBrowser();
    await waitFor(() =>
      expect(screen.getByText(/Network error/i)).toBeInTheDocument(),
    );
  });

  it("shows generic error when non-Error thrown", async () => {
    mockGet.mockRejectedValue("something went wrong");
    renderBrowser();
    await waitFor(() =>
      expect(
        screen.getByText(/failed to load tournaments/i),
      ).toBeInTheDocument(),
    );
  });

  it("shows empty message when no tournaments returned", async () => {
    mockGet.mockResolvedValue({ success: true, data: [] });
    renderBrowser({ emptyMessage: "Nothing here yet." });
    await waitFor(() =>
      expect(screen.getByText("Nothing here yet.")).toBeInTheDocument(),
    );
  });

  it("renders tournament cards when data is present", async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: [makeTournament({ name: "Battle Cup", status: "active" })],
    });
    renderBrowser({ statusFilter: "active" });
    await waitFor(() =>
      expect(screen.getByText("Battle Cup")).toBeInTheDocument(),
    );
  });

  it("passes array statusFilter as comma-joined query param", async () => {
    mockGet.mockResolvedValue({ success: true, data: [] });
    renderBrowser({ statusFilter: ["pending", "active"] });
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining("status=pending,active"),
      );
    });
  });

  it("passes string statusFilter as-is", async () => {
    mockGet.mockResolvedValue({ success: true, data: [] });
    renderBrowser({ statusFilter: "completed" });
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining("status=completed"),
      );
    });
  });

  it("shows 40K Beta badge for tournaments with enable40kFactions", async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: [makeTournament({ enable40kFactions: true })],
    });
    renderBrowser();
    await waitFor(() =>
      expect(screen.getByText(/40k beta/i)).toBeInTheDocument(),
    );
  });

  it("shows description text (stripped of markdown)", async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: [makeTournament({ description: "# Hello **World**" })],
    });
    renderBrowser();
    await waitFor(() =>
      expect(screen.getByText(/Hello World/i)).toBeInTheDocument(),
    );
  });

  it("shows Join Tournament button for authenticated pending non-full non-joined tournament", async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: [
        makeTournament({ status: "pending", playerCount: 8, participants: [] }),
      ],
    });
    renderBrowser();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /join tournament/i }),
      ).toBeInTheDocument(),
    );
  });

  it("navigates to tournament page on Join click", async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValue({
      success: true,
      data: [
        makeTournament({
          _id: "tid1",
          code: "JOIN01",
          status: "pending",
          playerCount: 8,
          participants: [],
        }),
      ],
    });
    renderBrowser();
    await waitFor(() =>
      screen.getByRole("button", { name: /join tournament/i }),
    );
    await user.click(screen.getByRole("button", { name: /join tournament/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/matches/spectate/JOIN01");
  });

  it("shows Joined badge when user has already joined", async () => {
    const userStore = makeUser({
      user: { id: "u1", username: "testuser", isAuthenticated: true },
    });
    (mockUseUserStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      userStore,
    );
    mockGet.mockResolvedValue({
      success: true,
      data: [
        makeTournament({
          status: "pending",
          participants: [{ _id: "p1", name: "testuser", faction: "Empire" }],
        }),
      ],
    });
    renderBrowser();
    await waitFor(() =>
      expect(screen.getByText(/joined/i)).toBeInTheDocument(),
    );
  });

  it("navigates to matches when user clicks Matches button", async () => {
    const user = userEvent.setup();
    const userStore = makeUser({
      user: { id: "u1", username: "testuser", isAuthenticated: true },
    });
    (mockUseUserStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      userStore,
    );
    mockGet.mockResolvedValue({
      success: true,
      data: [
        makeTournament({
          _id: "t42",
          code: "T42CUP",
          status: "pending",
          participants: [{ _id: "p1", name: "testuser", faction: "Empire" }],
        }),
      ],
    });
    renderBrowser();
    await waitFor(() => screen.getByRole("button", { name: /matches/i }));
    await user.click(screen.getByRole("button", { name: /matches/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/matches/tournament/T42CUP");
  });

  it("shows Full badge when tournament is full and user is not joined", async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: [
        makeTournament({
          status: "pending",
          playerCount: 1,
          participants: [
            { _id: "other", name: "someone_else", faction: "Chaos" },
          ],
        }),
      ],
    });
    renderBrowser();
    await waitFor(() =>
      expect(screen.getByText(/^full$/i)).toBeInTheDocument(),
    );
  });

  it("shows Sign In to Join for unauthenticated users on non-full pending tournament", async () => {
    (mockUseUserStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { id: "", username: "", isAuthenticated: false },
      isAuthenticated: vi.fn().mockReturnValue(false),
    });
    mockGet.mockResolvedValue({
      success: true,
      data: [
        makeTournament({ status: "pending", playerCount: 8, participants: [] }),
      ],
    });
    renderBrowser();
    await waitFor(() =>
      expect(screen.getByText(/sign in to join/i)).toBeInTheDocument(),
    );
  });

  it("shows Spectate button for non-joined tournaments", async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: [
        makeTournament({ status: "active", playerCount: 8, participants: [] }),
      ],
    });
    renderBrowser({ statusFilter: "active" });
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /spectate/i }),
      ).toBeInTheDocument(),
    );
  });

  it("shows View Results button for completed tournaments", async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: [
        makeTournament({
          status: "completed",
          playerCount: 8,
          participants: [],
        }),
      ],
    });
    renderBrowser({ statusFilter: "completed" });
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /view results/i }),
      ).toBeInTheDocument(),
    );
  });

  it("navigates to /t/:code on Spectate click when code is present", async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValue({
      success: true,
      data: [
        makeTournament({
          _id: "t99",
          code: "SPEC99",
          status: "active",
          playerCount: 8,
          participants: [],
        }),
      ],
    });
    renderBrowser({ statusFilter: "active" });
    await waitFor(() => screen.getByRole("button", { name: /spectate/i }));
    await user.click(screen.getByRole("button", { name: /spectate/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/matches/spectate/SPEC99");
  });

  it("shows Participated badge for completed joined tournament", async () => {
    const userStore = makeUser({
      user: { id: "u1", username: "testuser", isAuthenticated: true },
    });
    (mockUseUserStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      userStore,
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

  it("handles undefined data in response gracefully", async () => {
    mockGet.mockResolvedValue({ success: true });
    renderBrowser({ emptyMessage: "Nothing found." });
    await waitFor(() =>
      expect(screen.getByText("Nothing found.")).toBeInTheDocument(),
    );
  });
});
