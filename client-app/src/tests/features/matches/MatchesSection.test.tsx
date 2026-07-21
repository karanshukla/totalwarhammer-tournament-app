/**
 * Branch coverage for matches/components/MatchesSection.tsx:
 * - matches.length === 0 → "No Matches Generated Yet"
 * - isDoubleElim → Winners Bracket / Losers Bracket / Grand Final sections
 * - gfMatches.length > 1 → "Bracket Reset" badge
 * - isRoundRobin → "Round Robin" badge + standings table
 * - isSwiss → "Swiss System" badge + standings table
 * - isCurrentRound && !isRROrSwiss → "Current" badge
 * - !isCurrentRound && round < maxRound && !isRROrSwiss → "Completed" badge
 * - isAdmin && isActive && matches.length > 0 → footer with Advance Round
 * - isRoundRobin footer → "Finalize Tournament" text
 * - !isDoubleElim badge: "Round X of Y"
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import MatchesSection from "@/features/matches/components/MatchesSection";
import type { Match, Tournament } from "@/features/matches/components/types";

vi.mock("@/features/matches/components/MatchCard", () => ({
  default: ({ m }: { m: { matchNumber: number } }) => (
    <div data-testid={`match-card-${m.matchNumber}`} />
  ),
}));

type MatchStatus = "pending" | "in_progress" | "completed" | "disputed";
type BracketSide = "winners" | "losers" | "grand_final" | null;

function makeMatch(
  overrides: Partial<{
    _id: string;
    round: number;
    matchNumber: number;
    status: MatchStatus;
    winnerId: string | null;
    bracketSide: BracketSide;
  }> = {},
) {
  return {
    _id: overrides._id ?? "m1",
    round: overrides.round ?? 1,
    matchNumber: overrides.matchNumber ?? 1,
    player1: { participantId: "p1", name: "Grimgork", faction: "Greenskins" },
    player2: { participantId: "p2", name: "Luthor", faction: "Empire" },
    winnerId: overrides.winnerId ?? null,
    loserId: null,
    status: overrides.status ?? "pending",
    notes: "",
    reportedResults: [],
    resultOverrides: [],
    completedAt: null,
    bracketSide: overrides.bracketSide ?? null,
  };
}

function makeTournament(tournamentType = "Single Elimination") {
  return {
    _id: "t1",
    name: "Test Tournament",
    code: "CODE",
    description: "",
    playerCount: 2,
    tournamentType,
    bannedFactions: [],
    enable40kFactions: false,
    participants: [
      { _id: "p1", name: "Grimgork", faction: "Greenskins" },
      { _id: "p2", name: "Luthor", faction: "Empire" },
    ],
    status: "active" as const,
    createdAt: new Date().toISOString(),
    createdBy: "admin",
  };
}

const baseProps = {
  user: null,
  isAdmin: false,
  isActive: true,
  actionLoading: false,
  matchLoading: false,
  onRecordResult: vi.fn(),
  onReportResult: vi.fn(),
  onOverrideResult: vi.fn().mockResolvedValue(undefined),
  onResolveDispute: vi.fn(),
  onAdvanceRound: vi.fn(),
};

function renderSection(
  matches: ReturnType<typeof makeMatch>[],
  tournament = makeTournament(),
  props: Partial<typeof baseProps> = {},
) {
  return render(
    <ChakraProvider value={defaultSystem}>
      <MatchesSection
        matches={matches as unknown as Match[]}
        selected={tournament as unknown as Tournament}
        {...baseProps}
        {...props}
      />
    </ChakraProvider>,
  );
}

describe("MatchesSection – empty matches", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows 'No Matches Generated Yet' when matches array is empty", () => {
    renderSection([]);
    expect(screen.getByText(/no matches generated yet/i)).toBeInTheDocument();
  });
});

describe("MatchesSection – Single Elimination badges", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows 'Round X of Y' badge for single elim with matches", () => {
    renderSection([makeMatch({ round: 1 })]);
    expect(screen.getByText(/round 1 of 1/i)).toBeInTheDocument();
  });

  it("shows 'Current' badge for the highest round when isActive", () => {
    renderSection(
      [
        makeMatch({
          _id: "m1",
          round: 1,
          matchNumber: 1,
          status: "completed",
          winnerId: "p1",
        }),
        makeMatch({ _id: "m2", round: 2, matchNumber: 2, status: "pending" }),
      ],
      makeTournament("Single Elimination"),
      { isActive: true },
    );
    expect(screen.getByText("Current")).toBeInTheDocument();
  });

  it("shows 'Completed' badge for rounds before the max round", () => {
    renderSection(
      [
        makeMatch({
          _id: "m1",
          round: 1,
          matchNumber: 1,
          status: "completed",
          winnerId: "p1",
        }),
        makeMatch({ _id: "m2", round: 2, matchNumber: 2, status: "pending" }),
      ],
      makeTournament("Single Elimination"),
      { isActive: true },
    );
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });
});

describe("MatchesSection – Round Robin", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows 'Round Robin' badge for Round Robin tournament", () => {
    renderSection([makeMatch({ round: 1 })], makeTournament("Round Robin"));
    expect(screen.getByText("Round Robin")).toBeInTheDocument();
  });

  it("shows standings table for Round Robin with completed matches", () => {
    renderSection(
      [
        makeMatch({
          _id: "m1",
          round: 1,
          status: "completed",
          winnerId: "p1",
          bracketSide: null,
        }),
      ],
      makeTournament("Round Robin"),
    );
    expect(screen.getByText("Standings")).toBeInTheDocument();
  });
});

describe("MatchesSection – Swiss System", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows 'Swiss System' badge", () => {
    renderSection([makeMatch({ round: 1 })], makeTournament("Swiss System"));
    expect(screen.getByText("Swiss System")).toBeInTheDocument();
  });
});

describe("MatchesSection – Double Elimination", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows 'Double Elimination' badge", () => {
    renderSection(
      [makeMatch({ _id: "m1", round: 1, bracketSide: "winners" })],
      makeTournament("Double Elimination"),
    );
    expect(screen.getByText("Double Elimination")).toBeInTheDocument();
  });

  it("shows Winners Bracket section", () => {
    renderSection(
      [makeMatch({ _id: "m1", round: 1, bracketSide: "winners" })],
      makeTournament("Double Elimination"),
    );
    expect(screen.getByText(/winners bracket/i)).toBeInTheDocument();
  });

  it("shows Losers Bracket section when losers matches exist", () => {
    renderSection(
      [
        makeMatch({
          _id: "m1",
          round: 1,
          matchNumber: 1,
          bracketSide: "winners",
        }),
        makeMatch({
          _id: "m2",
          round: 1,
          matchNumber: 2,
          bracketSide: "losers",
        }),
      ],
      makeTournament("Double Elimination"),
    );
    expect(screen.getByText(/losers bracket/i)).toBeInTheDocument();
  });

  it("shows 'Grand Final' section when grand_final matches exist", () => {
    renderSection(
      [
        makeMatch({
          _id: "m1",
          round: 1,
          matchNumber: 1,
          bracketSide: "winners",
        }),
        makeMatch({
          _id: "m2",
          round: 99,
          matchNumber: 2,
          bracketSide: "grand_final",
        }),
      ],
      makeTournament("Double Elimination"),
    );
    expect(screen.getByText(/grand final/i)).toBeInTheDocument();
  });

  it("shows 'Bracket Reset' badge when gfMatches.length > 1", () => {
    renderSection(
      [
        makeMatch({
          _id: "m1",
          round: 1,
          matchNumber: 1,
          bracketSide: "winners",
        }),
        makeMatch({
          _id: "m2",
          round: 99,
          matchNumber: 2,
          bracketSide: "grand_final",
        }),
        makeMatch({
          _id: "m3",
          round: 100,
          matchNumber: 3,
          bracketSide: "grand_final",
        }),
      ],
      makeTournament("Double Elimination"),
    );
    expect(screen.getByText(/bracket reset/i)).toBeInTheDocument();
  });
});

describe("MatchesSection – admin footer", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows footer with 'Advance Round' when isAdmin && isActive && matches.length > 0", () => {
    renderSection([makeMatch()], makeTournament(), {
      isAdmin: true,
      isActive: true,
    });
    expect(
      screen.getByRole("button", { name: /advance round/i }),
    ).toBeInTheDocument();
  });

  it("shows 'Finalize Tournament' button for Round Robin", () => {
    renderSection([makeMatch()], makeTournament("Round Robin"), {
      isAdmin: true,
      isActive: true,
    });
    expect(
      screen.getByRole("button", { name: /finalize tournament/i }),
    ).toBeInTheDocument();
  });

  it("does not show footer when isAdmin=false", () => {
    renderSection([makeMatch()], makeTournament(), {
      isAdmin: false,
      isActive: true,
    });
    expect(
      screen.queryByRole("button", { name: /advance round/i }),
    ).not.toBeInTheDocument();
  });

  it("calls onAdvanceRound when Advance Round button is clicked", () => {
    const onAdvanceRound = vi.fn();
    renderSection([makeMatch()], makeTournament(), {
      isAdmin: true,
      isActive: true,
      onAdvanceRound,
    });
    fireEvent.click(screen.getByRole("button", { name: /advance round/i }));
    expect(onAdvanceRound).toHaveBeenCalledTimes(1);
  });
});
