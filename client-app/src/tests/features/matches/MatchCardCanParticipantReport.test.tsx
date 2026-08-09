/**
 * Missing coverage for matches/components/MatchCard.tsx
 *
 * Covers the canParticipantReport=true branch (lines 434-501):
 *   - canParticipantReport=true, no myReport → "Who won this match?" buttons
 *   - canParticipantReport=true, myReport.winnerId === player1 → trophy + verdigris palette on p1
 *   - canParticipantReport=true, myReport.winnerId === player2 → trophy + verdigris palette on p2
 *   - clicking p1 "won" button fires onReportResult
 *   - clicking p2 "won" button fires onReportResult
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import MatchCard from "@/features/matches/components/MatchCard";
import type { Match } from "@/features/matches/components/types";

type MatchStatus = "pending" | "in_progress" | "completed" | "disputed";
type BracketSide = "winners" | "losers" | "grand_final" | null;

const baseMatch = {
  _id: "m1",
  round: 1,
  matchNumber: 1,
  player1: { participantId: "p1", name: "Grimgork", faction: "Greenskins" },
  player2: { participantId: "p2", name: "Luthor", faction: "Empire" },
  winnerId: null as string | null,
  loserId: null as string | null,
  status: "in_progress" as MatchStatus,
  notes: "",
  reportedResults: [] as {
    reportedBy: string;
    reportedByName: string;
    winnerId: string;
  }[],
  resultOverrides: [] as {
    previousWinnerId: string | null;
    newWinnerId: string;
    overriddenBy: string;
    reason: string;
    overriddenAt: string;
  }[],
  completedAt: null as string | null,
  bracketSide: null as BracketSide,
};

const baseProps = {
  isAdmin: false,
  isActive: true,
  p1Won: false,
  p2Won: false,
  isOverriding: false,
  isP1: true,
  isP2: false,
  myReport: undefined as
    | { reportedBy: string; reportedByName: string; winnerId: string }
    | undefined,
  canParticipantReport: true,
  actionLoading: false,
  overrideLoading: false,
  overrideWinnerId: "",
  overrideReason: "",
  onRecordResult: vi.fn(),
  onReportResult: vi.fn(),
  onResolveDispute: vi.fn(),
  onStartOverride: vi.fn(),
  onCancelOverride: vi.fn(),
  onSetOverrideWinner: vi.fn(),
  onSetOverrideReason: vi.fn(),
  onConfirmOverride: vi.fn(),
};

function renderCard(
  matchOverrides: Partial<typeof baseMatch> = {},
  propOverrides: Partial<typeof baseProps> = {},
) {
  return render(
    <ChakraProvider value={defaultSystem}>
      <MatchCard
        m={{ ...baseMatch, ...matchOverrides } as unknown as Match}
        {...baseProps}
        {...propOverrides}
      />
    </ChakraProvider>,
  );
}

describe("MatchCard – canParticipantReport=true, no previous report", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows 'Who won this match?' when canParticipantReport=true and myReport is undefined", () => {
    renderCard();
    expect(screen.getByText(/who won this match\?/i)).toBeInTheDocument();
  });

  it("renders both player name 'won' buttons", () => {
    renderCard();
    expect(
      screen.getByRole("button", { name: /grimgork won/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /luthor won/i }),
    ).toBeInTheDocument();
  });

  it("calls onReportResult with player1 participantId when player1 button clicked", () => {
    renderCard();
    fireEvent.click(screen.getByRole("button", { name: /grimgork won/i }));
    expect(baseProps.onReportResult).toHaveBeenCalledWith("m1", "p1");
  });

  it("calls onReportResult with player2 participantId when player2 button clicked", () => {
    renderCard();
    fireEvent.click(screen.getByRole("button", { name: /luthor won/i }));
    expect(baseProps.onReportResult).toHaveBeenCalledWith("m1", "p2");
  });
});

describe("MatchCard – canParticipantReport=true, myReport on player1", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows 'Change your reported winner:' when myReport is set", () => {
    renderCard(
      {},
      {
        myReport: {
          reportedBy: "p1",
          reportedByName: "Grimgork",
          winnerId: "p1",
        },
      },
    );
    expect(
      screen.getByText(/change your reported winner:/i),
    ).toBeInTheDocument();
  });

  it("renders both player buttons even when myReport is set (player1 as selected winner)", () => {
    renderCard(
      {},
      {
        myReport: {
          reportedBy: "p1",
          reportedByName: "Grimgork",
          winnerId: "p1",
        },
      },
    );
    // Both buttons should be present
    expect(
      screen.getByRole("button", { name: /grimgork won/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /luthor won/i }),
    ).toBeInTheDocument();
  });
});

describe("MatchCard – canParticipantReport=true, myReport on player2", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders player2 button as highlighted when myReport.winnerId === player2.participantId", () => {
    renderCard(
      {},
      {
        isP2: true,
        isP1: false,
        myReport: {
          reportedBy: "p2",
          reportedByName: "Luthor",
          winnerId: "p2",
        },
      },
    );
    expect(
      screen.getByText(/change your reported winner:/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /luthor won/i }),
    ).toBeInTheDocument();
  });
});

// ─── Admin record result: player2 wins onClick (line 434) ────────────────────

describe("MatchCard – admin record result player2 wins button (line ~434)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls onRecordResult with player2 participantId when Luthor wins button clicked", () => {
    const onRecordResult = vi.fn();
    renderCard(
      { status: "pending" },
      {
        isAdmin: true,
        isActive: true,
        isP1: false,
        isP2: false,
        canParticipantReport: false,
        onRecordResult,
      },
    );
    // "Luthor wins" is the record-result button for player2 (admin-only section)
    fireEvent.click(screen.getByRole("button", { name: /luthor wins/i }));
    expect(onRecordResult).toHaveBeenCalledWith("m1", "p2");
  });
});
