/**
 * Branch coverage for UserStatsCard.tsx:
 * - loading=true → shows skeleton / loading state (initial render)
 * - loading=false, stats=null → shows 0 values, no faction section, no activity message
 *   (because factions.length is 0 AND tournamentsCreated=0, matchesPlayed=0)
 * - loading=false, stats with factions → shows faction section; f.count===1 → "match"; f.count>1 → "matches"
 * - loading=false, matchesPlayed=0 AND tournamentsCreated=0 → shows "No activity" message (line 126-133)
 * - loading=false, stats with activity → no "No activity" message
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";

vi.mock("@/features/account/api/accountApi", () => ({
  fetchUserStats: vi.fn(),
}));

import { fetchUserStats } from "@/features/account/api/accountApi";
import UserStatsCard from "@/features/account/components/UserStatsCard";

const mockFetchUserStats = vi.mocked(fetchUserStats);

function renderCard() {
  return render(
    <ChakraProvider value={defaultSystem}>
      <UserStatsCard />
    </ChakraProvider>,
  );
}

describe("UserStatsCard – null stats (fetchUserStats returns null)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders 0 values when stats is null", async () => {
    mockFetchUserStats.mockResolvedValueOnce(null);
    renderCard();

    await waitFor(() => {
      // Value is ?? 0 so should show "0" for all stats
      const zeros = screen.getAllByText("0");
      expect(zeros.length).toBeGreaterThan(0);
    });
  });

  it("does not show faction section when stats is null", async () => {
    mockFetchUserStats.mockResolvedValueOnce(null);
    renderCard();

    await waitFor(() => {
      // Faction section only shows when loading OR factions.length > 0
      // With null stats, neither condition is true
      expect(screen.queryByText(/factions played/i)).not.toBeInTheDocument();
    });
  });
});

describe("UserStatsCard – no activity message (line 126-133)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows no-activity message when matchesPlayed=0 and tournamentsCreated=0", async () => {
    mockFetchUserStats.mockResolvedValueOnce({
      tournamentsCreated: 0,
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      factions: [],
    });
    renderCard();

    await waitFor(() =>
      expect(
        screen.getByText(/no activity recorded yet/i),
      ).toBeInTheDocument(),
    );
  });

  it("does not show no-activity message when there is activity", async () => {
    mockFetchUserStats.mockResolvedValueOnce({
      tournamentsCreated: 2,
      matchesPlayed: 5,
      wins: 3,
      losses: 2,
      factions: [{ name: "Empire", count: 3 }],
    });
    renderCard();

    await waitFor(() =>
      expect(screen.queryByText(/no activity recorded yet/i)).not.toBeInTheDocument(),
    );
  });
});

describe("UserStatsCard – faction count singular/plural (line 118)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows 'match' (singular) when faction count is 1", async () => {
    mockFetchUserStats.mockResolvedValueOnce({
      tournamentsCreated: 1,
      matchesPlayed: 1,
      wins: 1,
      losses: 0,
      factions: [{ name: "Empire", count: 1 }],
    });
    renderCard();

    await waitFor(() =>
      expect(screen.getByText("1 match")).toBeInTheDocument(),
    );
  });

  it("shows 'matches' (plural) when faction count is >1", async () => {
    mockFetchUserStats.mockResolvedValueOnce({
      tournamentsCreated: 1,
      matchesPlayed: 5,
      wins: 3,
      losses: 2,
      factions: [{ name: "Dwarfs", count: 5 }],
    });
    renderCard();

    await waitFor(() =>
      expect(screen.getByText("5 matches")).toBeInTheDocument(),
    );
  });

  it("shows faction section heading when factions are present", async () => {
    mockFetchUserStats.mockResolvedValueOnce({
      tournamentsCreated: 1,
      matchesPlayed: 3,
      wins: 2,
      losses: 1,
      factions: [{ name: "Empire", count: 2 }, { name: "Dwarfs", count: 1 }],
    });
    renderCard();

    await waitFor(() =>
      expect(screen.getByText(/factions played/i)).toBeInTheDocument(),
    );
  });
});
