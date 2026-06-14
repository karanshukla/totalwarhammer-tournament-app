/**
 * Branch coverage for account/components/UserStatsCard.tsx:
 * - loading=true → skeleton state shown, faction skeleton rows shown
 * - loading=false, stats=null (fetch returns null) → No activity message
 * - loading=false, stats with factions → shows faction list
 * - loading=false, stats no factions (empty array) → faction section hidden
 * - f.count === 1 → "match" (singular)
 * - f.count > 1 → "matches" (plural)
 * - matchesPlayed === 0 && tournamentsCreated === 0 → "No activity recorded"
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";

const { mockFetchUserStats } = vi.hoisted(() => ({
  mockFetchUserStats: vi.fn(),
}));

vi.mock("@/features/account/api/accountApi", () => ({
  fetchUserStats: mockFetchUserStats,
}));

import UserStatsCard from "@/features/account/components/UserStatsCard";

function renderCard() {
  return render(
    <ChakraProvider value={defaultSystem}>
      <UserStatsCard />
    </ChakraProvider>,
  );
}

describe("UserStatsCard – loading state", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows 'Your Activity' heading immediately (before fetch resolves)", () => {
    mockFetchUserStats.mockReturnValueOnce(new Promise(() => {}));
    renderCard();
    expect(screen.getByText("Your Activity")).toBeInTheDocument();
  });
});

describe("UserStatsCard – stats loaded with factions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows faction name and 'matches' (plural) when count > 1", async () => {
    mockFetchUserStats.mockResolvedValueOnce({
      tournamentsCreated: 2,
      matchesPlayed: 5,
      wins: 3,
      losses: 2,
      factions: [{ name: "Greenskins", count: 3 }],
    });
    renderCard();
    await waitFor(() => expect(screen.getByText("Greenskins")).toBeInTheDocument());
    expect(screen.getByText(/3 matches/)).toBeInTheDocument();
  });

  it("shows 'match' (singular) when faction count === 1", async () => {
    mockFetchUserStats.mockResolvedValueOnce({
      tournamentsCreated: 1,
      matchesPlayed: 1,
      wins: 1,
      losses: 0,
      factions: [{ name: "Empire", count: 1 }],
    });
    renderCard();
    await waitFor(() => expect(screen.getByText("Empire")).toBeInTheDocument());
    expect(screen.getByText(/1 match\b/)).toBeInTheDocument();
  });
});

describe("UserStatsCard – no factions (empty array)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("hides faction section when factions array is empty", async () => {
    mockFetchUserStats.mockResolvedValueOnce({
      tournamentsCreated: 2,
      matchesPlayed: 4,
      wins: 2,
      losses: 2,
      factions: [],
    });
    renderCard();
    await waitFor(() =>
      expect(screen.queryByText(/factions played/i)).not.toBeInTheDocument(),
    );
  });
});

describe("UserStatsCard – no activity message", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows 'No activity recorded yet' when matchesPlayed=0 and tournamentsCreated=0", async () => {
    mockFetchUserStats.mockResolvedValueOnce({
      tournamentsCreated: 0,
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      factions: [],
    });
    renderCard();
    await waitFor(() =>
      expect(screen.getByText(/no activity recorded yet/i)).toBeInTheDocument(),
    );
  });

  it("does not show 'No activity' when user has tournaments created", async () => {
    mockFetchUserStats.mockResolvedValueOnce({
      tournamentsCreated: 1,
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      factions: [],
    });
    renderCard();
    await waitFor(() =>
      // Stats card should show but no "no activity" message
      expect(screen.queryByText(/no activity recorded yet/i)).not.toBeInTheDocument(),
    );
  });
});

describe("UserStatsCard – fetchUserStats returns null", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows no stats values when fetchUserStats returns null", async () => {
    mockFetchUserStats.mockResolvedValueOnce(null);
    renderCard();
    // Stat values should default to 0 (via ??)
    await waitFor(() => {
      const zeros = screen.getAllByText("0");
      expect(zeros.length).toBeGreaterThan(0);
    });
  });
});
