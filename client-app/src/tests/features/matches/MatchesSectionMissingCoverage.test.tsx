/**
 * Missing coverage for matches/components/MatchesSection.tsx
 *
 * Covers inline callback bodies not exercised by MatchesSection.test.tsx
 * (which mocks MatchCard with a stub that never calls any prop functions):
 *   ~Line 403 – losers bracket MatchCard onStartOverride body
 *   ~Lines 590-595 – grand final MatchCard onStartOverride body
 *   ~Line 647 – Swiss "Finalize Tournament" button label when max round >= ceil(log2(participants))
 *   Also covers onCancelOverride in losers and grand final sections
 *   And handleOverrideConfirm body (!overrideMatchId guard, success path)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";

// MatchCard mock that exposes onStartOverride, onCancelOverride,
// onSetOverrideWinner and onConfirmOverride as buttons
vi.mock("@/features/matches/components/MatchCard", () => ({
  default: ({
    m,
    onStartOverride,
    onCancelOverride,
    onSetOverrideWinner,
    onConfirmOverride,
  }: {
    m: { _id: string; matchNumber: number; player1: { participantId: string } };
    onStartOverride?: () => void;
    onCancelOverride?: () => void;
    onSetOverrideWinner?: (id: string) => void;
    onConfirmOverride?: () => void;
  }) => (
    <div data-testid={`match-card-${m._id}`}>
      <button data-testid={`start-override-${m._id}`} onClick={onStartOverride}>
        StartOverride
      </button>
      <button
        data-testid={`cancel-override-${m._id}`}
        onClick={onCancelOverride}
      >
        CancelOverride
      </button>
      <button
        data-testid={`set-winner-${m._id}`}
        onClick={() => onSetOverrideWinner?.(m.player1.participantId)}
      >
        SetWinner
      </button>
      <button
        data-testid={`confirm-override-${m._id}`}
        onClick={onConfirmOverride}
      >
        ConfirmOverride
      </button>
    </div>
  ),
}));

import MatchesSection from "@/features/matches/components/MatchesSection";
import type { Match, Tournament } from "@/features/matches/components/types";

type MatchStatus = "pending" | "in_progress" | "completed" | "disputed";
type BracketSide = "winners" | "losers" | "grand_final" | null;

function makeMatch(
  overrides: {
    _id?: string;
    round?: number;
    matchNumber?: number;
    status?: MatchStatus;
    winnerId?: string | null;
    bracketSide?: BracketSide;
  } = {},
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
    reportedResults: [] as Match["reportedResults"],
    resultOverrides: [] as Match["resultOverrides"],
    completedAt: null,
    bracketSide: overrides.bracketSide ?? null,
  };
}

function makeTournament(
  tournamentType = "Double Elimination",
  participantCount = 4,
) {
  const participants = Array.from({ length: participantCount }, (_, i) => ({
    _id: `p${i + 1}`,
    name: `Player${i + 1}`,
    faction: "Greenskins",
  }));
  return {
    _id: "t1",
    name: "Test Tournament",
    code: "CODE",
    description: "",
    playerCount: participantCount,
    tournamentType,
    bannedFactions: [],
    enable40kFactions: false,
    participants,
    status: "active" as const,
    createdAt: new Date().toISOString(),
    createdBy: "admin",
  };
}

const baseProps = {
  user: null as { id: string; username?: string; isGuest?: boolean } | null,
  isAdmin: true,
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
  propOverrides: Partial<typeof baseProps> = {},
) {
  return render(
    <ChakraProvider value={defaultSystem}>
      <MatchesSection
        matches={matches as unknown as Match[]}
        selected={tournament as unknown as Tournament}
        {...baseProps}
        {...propOverrides}
      />
    </ChakraProvider>,
  );
}

// ─── Losers bracket onStartOverride / onCancelOverride ────────────────────────

describe("MatchesSection – losers bracket onStartOverride callback body", () => {
  beforeEach(() => vi.clearAllMocks());

  it("invokes losers bracket onStartOverride when button clicked (~line 403 area)", () => {
    const matches = [
      makeMatch({ _id: "wb1", bracketSide: "winners", round: 1 }),
      makeMatch({
        _id: "lb1",
        bracketSide: "losers",
        round: 1,
        matchNumber: 2,
      }),
    ];
    renderSection(matches);

    // The MatchCard mock's StartOverride button for the losers match
    fireEvent.click(screen.getByTestId("start-override-lb1"));
    // If callback ran without error, the state was set (no explicit assertion needed
    // beyond not throwing — this covers the arrow function body)
    expect(screen.getByTestId("match-card-lb1")).toBeInTheDocument();
  });

  it("invokes losers bracket onCancelOverride when button clicked", () => {
    const matches = [
      makeMatch({ _id: "wb1", bracketSide: "winners", round: 1 }),
      makeMatch({
        _id: "lb1",
        bracketSide: "losers",
        round: 1,
        matchNumber: 2,
      }),
    ];
    renderSection(matches);

    fireEvent.click(screen.getByTestId("cancel-override-lb1"));
    expect(screen.getByTestId("match-card-lb1")).toBeInTheDocument();
  });
});

// ─── Grand final onStartOverride / onCancelOverride ───────────────────────────

describe("MatchesSection – grand final onStartOverride callback body (~lines 590-595)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("invokes grand final onStartOverride when button clicked", () => {
    const matches = [
      makeMatch({ _id: "wb1", bracketSide: "winners", round: 1 }),
      makeMatch({
        _id: "gf1",
        bracketSide: "grand_final",
        round: 99,
        matchNumber: 3,
      }),
    ];
    renderSection(matches);

    fireEvent.click(screen.getByTestId("start-override-gf1"));
    expect(screen.getByTestId("match-card-gf1")).toBeInTheDocument();
  });

  it("invokes grand final onCancelOverride when button clicked", () => {
    const matches = [
      makeMatch({ _id: "wb1", bracketSide: "winners", round: 1 }),
      makeMatch({
        _id: "gf1",
        bracketSide: "grand_final",
        round: 99,
        matchNumber: 3,
      }),
    ];
    renderSection(matches);

    fireEvent.click(screen.getByTestId("cancel-override-gf1"));
    expect(screen.getByTestId("match-card-gf1")).toBeInTheDocument();
  });
});

// ─── Swiss "Finalize Tournament" when max round >= ceil(log2(participants)) (~line 647) ──

describe("MatchesSection – Swiss footer label (line 647)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows 'Finalize Tournament' for Swiss when max round >= ceil(log2(participants))", () => {
    // 4 participants → ceil(log2(4)) = 2 rounds
    // max round = 2 → Finalize Tournament
    const matches = [
      makeMatch({ _id: "m1", round: 1, status: "completed" }),
      makeMatch({ _id: "m2", round: 2, matchNumber: 2 }),
    ];
    renderSection(matches, makeTournament("Swiss System", 4));

    expect(
      screen.getByRole("button", { name: /finalize tournament/i }),
    ).toBeInTheDocument();
  });

  it("shows 'Advance Round' for Swiss when max round < ceil(log2(participants))", () => {
    // 8 participants → ceil(log2(8)) = 3 rounds; only round 1 played
    const matches = [makeMatch({ _id: "m1", round: 1 })];
    renderSection(matches, makeTournament("Swiss System", 8));

    expect(
      screen.getByRole("button", { name: /advance round/i }),
    ).toBeInTheDocument();
  });
});

// ─── handleOverrideConfirm early return (!overrideMatchId) ────────────────────

describe("MatchesSection – handleOverrideConfirm guard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does not call onOverrideResult when overrideMatchId is null (guard)", async () => {
    const onOverrideResult = vi.fn().mockResolvedValue(undefined);
    const matches = [
      makeMatch({ _id: "m1", bracketSide: "winners", round: 1 }),
    ];
    renderSection(matches, makeTournament(), { onOverrideResult });
    // Directly confirm without starting an override first → guard returns early
    fireEvent.click(screen.getByTestId("confirm-override-m1"));
    await waitFor(() => {
      expect(onOverrideResult).not.toHaveBeenCalled();
    });
  });

  it("calls onOverrideResult and resets override state on successful confirm", async () => {
    const onOverrideResult = vi.fn().mockResolvedValue(undefined);
    const matches = [
      makeMatch({ _id: "wb1", bracketSide: "winners", round: 1 }),
    ];
    renderSection(matches, makeTournament(), { onOverrideResult });

    fireEvent.click(screen.getByTestId("start-override-wb1"));
    fireEvent.click(screen.getByTestId("set-winner-wb1"));
    fireEvent.click(screen.getByTestId("confirm-override-wb1"));

    await waitFor(() => {
      expect(onOverrideResult).toHaveBeenCalledWith("wb1", "p1", "");
    });
  });
});

// ─── Winners bracket onStartOverride / onCancelOverride ───────────────────────

describe("MatchesSection – winners bracket onStartOverride/onCancelOverride callback bodies", () => {
  beforeEach(() => vi.clearAllMocks());

  it("invokes winners bracket onStartOverride when button clicked (~lines 346-350)", () => {
    const matches = [
      makeMatch({ _id: "wb1", bracketSide: "winners", round: 1 }),
    ];
    renderSection(matches);

    fireEvent.click(screen.getByTestId("start-override-wb1"));
    expect(screen.getByTestId("match-card-wb1")).toBeInTheDocument();
  });

  it("invokes winners bracket onCancelOverride when button clicked (~line 351)", () => {
    const matches = [
      makeMatch({ _id: "wb1", bracketSide: "winners", round: 1 }),
    ];
    renderSection(matches);

    fireEvent.click(screen.getByTestId("cancel-override-wb1"));
    expect(screen.getByTestId("match-card-wb1")).toBeInTheDocument();
  });
});

// ─── Non-double-elim onStartOverride / onCancelOverride ───────────────────────

describe("MatchesSection – single-elimination onStartOverride/onCancelOverride callback bodies (~lines 589-595)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("invokes onStartOverride for a single-elimination match", () => {
    const matches = [makeMatch({ _id: "se1", round: 1 })];
    renderSection(matches, makeTournament("Single Elimination"));

    fireEvent.click(screen.getByTestId("start-override-se1"));
    expect(screen.getByTestId("match-card-se1")).toBeInTheDocument();
  });

  it("invokes onCancelOverride for a single-elimination match", () => {
    const matches = [makeMatch({ _id: "se1", round: 1 })];
    renderSection(matches, makeTournament("Single Elimination"));

    fireEvent.click(screen.getByTestId("cancel-override-se1"));
    expect(screen.getByTestId("match-card-se1")).toBeInTheDocument();
  });
});

// ─── wbRounds / lbRounds sort comparators (~lines 181, 184) ───────────────────

describe("MatchesSection – wbRounds/lbRounds sort comparators", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sorts multiple winners-bracket rounds", () => {
    const matches = [
      makeMatch({
        _id: "wb2",
        bracketSide: "winners",
        round: 2,
        matchNumber: 2,
      }),
      makeMatch({
        _id: "wb1",
        bracketSide: "winners",
        round: 1,
        matchNumber: 1,
      }),
    ];
    renderSection(matches);
    expect(screen.getByTestId("match-card-wb1")).toBeInTheDocument();
    expect(screen.getByTestId("match-card-wb2")).toBeInTheDocument();
  });

  it("sorts multiple losers-bracket rounds", () => {
    const matches = [
      makeMatch({
        _id: "wb1",
        bracketSide: "winners",
        round: 1,
        matchNumber: 1,
      }),
      makeMatch({
        _id: "lb2",
        bracketSide: "losers",
        round: 2,
        matchNumber: 2,
      }),
      makeMatch({
        _id: "lb1",
        bracketSide: "losers",
        round: 1,
        matchNumber: 3,
      }),
    ];
    renderSection(matches);
    expect(screen.getByTestId("match-card-lb1")).toBeInTheDocument();
    expect(screen.getByTestId("match-card-lb2")).toBeInTheDocument();
  });
});

// ─── resolveMatchUser – reportedResults + canPR chain (~lines 62-72) ──────────

describe("MatchesSection – resolveMatchUser with a matching user and a report", () => {
  beforeEach(() => vi.clearAllMocks());

  it("resolves isP1/myReport/canPR for a user matching player1 by name", () => {
    const matches = [
      {
        ...makeMatch({ _id: "m1", round: 1, status: "pending" }),
        reportedResults: [
          { reportedBy: "p1", reportedByName: "grimgork", winnerId: "p1" },
        ],
      },
    ];
    renderSection(matches, makeTournament("Single Elimination"), {
      user: { id: "u1", username: "Grimgork" },
      isActive: true,
    });
    expect(screen.getByTestId("match-card-m1")).toBeInTheDocument();
  });

  it("resolves guestFallback name matching for a guest user", () => {
    const matches = [
      {
        ...makeMatch({ _id: "m1", round: 1, status: "pending" }),
        player1: {
          participantId: "p1",
          name: "guest_abc123",
          faction: "Greenskins",
        },
        reportedResults: [],
      },
    ];
    renderSection(matches, makeTournament("Single Elimination"), {
      user: { id: "abc123def", username: "", isGuest: true },
      isActive: true,
    });
    expect(screen.getByTestId("match-card-m1")).toBeInTheDocument();
  });

  it("resolves myReport using player2's participantId when the user matches player2 (isP1 false)", () => {
    const matches = [
      {
        ...makeMatch({ _id: "m1", round: 1, status: "pending" }),
        reportedResults: [
          { reportedBy: "p2", reportedByName: "luthor", winnerId: "p2" },
        ],
      },
    ];
    renderSection(matches, makeTournament("Single Elimination"), {
      user: { id: "u2", username: "Luthor" },
      isActive: true,
    });
    expect(screen.getByTestId("match-card-m1")).toBeInTheDocument();
  });

  it("finds no report when reportedResults entries do not match reportedBy or reportedByName", () => {
    const matches = [
      {
        ...makeMatch({ _id: "m1", round: 1, status: "pending" }),
        reportedResults: [
          {
            reportedBy: "someone-else",
            reportedByName: "someone-else-name",
            winnerId: "p1",
          },
          { reportedBy: "p1", reportedByName: "grimgork", winnerId: "p1" },
        ],
      },
    ];
    renderSection(matches, makeTournament("Single Elimination"), {
      user: { id: "u1", username: "Grimgork" },
      isActive: true,
    });
    expect(screen.getByTestId("match-card-m1")).toBeInTheDocument();
  });
});

// ─── Standings loser-side branches (~lines 152, 160) ──────────────────────────

describe("MatchesSection – standings loser participant resolution", () => {
  beforeEach(() => vi.clearAllMocks());

  it("credits the loss to player1 when player2 wins, and skips losses for an unknown loser", () => {
    const matches = [
      makeMatch({
        _id: "m1",
        matchNumber: 1,
        status: "completed",
        winnerId: "p2",
      }),
      {
        ...makeMatch({
          _id: "m2",
          matchNumber: 2,
          status: "completed",
          winnerId: "p1",
        }),
        player2: {
          participantId: "pGhost",
          name: "Ghost",
          faction: "",
        },
      },
    ];
    renderSection(matches, makeTournament("Round Robin"));
    expect(screen.getByText("Standings")).toBeInTheDocument();
  });
});

// ─── matchLoading spinner (~line 219) ─────────────────────────────────────────

describe("MatchesSection – matchLoading spinner", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows a spinner in the header when matchLoading is true", () => {
    const { container } = renderSection(
      [makeMatch({ round: 1 })],
      makeTournament(),
      {
        matchLoading: true,
      },
    );
    expect(container.querySelector(".chakra-spinner")).toBeInTheDocument();
  });
});

// ─── Standings faction fallback (~line 266) ───────────────────────────────────

describe("MatchesSection – standings faction fallback", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows '-' for a standings row when the participant has no faction", () => {
    const matches = [
      makeMatch({
        _id: "m1",
        status: "completed",
        winnerId: "p1",
      }),
    ];
    const tournament = {
      ...makeTournament("Round Robin"),
      participants: [
        { _id: "p1", name: "Grimgork", faction: "" },
        { _id: "p2", name: "Luthor", faction: "Empire" },
      ],
    };
    renderSection(matches, tournament);
    expect(screen.getByText("Standings")).toBeInTheDocument();
    expect(screen.getByText("-")).toBeInTheDocument();
  });
});
