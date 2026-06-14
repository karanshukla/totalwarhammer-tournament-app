/**
 * Branch coverage for matches/components/MatchCard.tsx:
 * - m.status === "pending" → "Pending" badge
 * - m.status === "in_progress" → "In Progress" badge
 * - m.status === "completed" → "Completed" badge
 * - m.status === "disputed" → "⚠ Disputed" badge
 * - p1Won → W badge on player1
 * - m.winnerId && !p1Won → L badge on player1
 * - p2Won → W badge on player2
 * - m.winnerId && !p2Won && player2 !== "BYE" → L badge on player2
 * - player2.name === "BYE" → no L badge
 * - resultOverrides.length > 0 → "Overridden" button shown
 * - resultOverrides.length > 1 → "2×" count prefix
 * - m.winnerId → Winner section shown
 * - canParticipantReport + no myReport → "Who won this match?"
 * - canParticipantReport + myReport → "Change your reported winner:"
 * - isOverriding → override panel, Cancel/Confirm buttons
 * - isOverriding + resultOverrides.length===1 → "overridden once" message
 * - isAdmin && isActive && status !== completed/disputed → record result buttons
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import MatchCard from "@/features/matches/components/MatchCard";

const baseMatch = {
  _id: "m1",
  round: 1,
  matchNumber: 1,
  player1: { participantId: "p1", name: "Grimgork", faction: "Greenskins" },
  player2: { participantId: "p2", name: "Luthor", faction: "Empire" },
  winnerId: null as string | null,
  loserId: null as string | null,
  status: "pending" as "pending" | "in_progress" | "completed" | "disputed",
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
  bracketSide: null as "winners" | "losers" | "grand_final" | null,
};

const baseFns = {
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
  matchOverride: Partial<typeof baseMatch> = {},
  extraProps: Record<string, unknown> = {},
) {
  const m = { ...baseMatch, ...matchOverride };
  return render(
    <ChakraProvider value={defaultSystem}>
      <MatchCard
        m={m}
        p1Won={false}
        p2Won={false}
        isOverriding={false}
        isAdmin={false}
        isActive={false}
        myReport={undefined}
        canParticipantReport={false}
        isP1={false}
        isP2={false}
        actionLoading={false}
        overrideLoading={false}
        overrideWinnerId=""
        overrideReason=""
        borderColor="border"
        mutedBg="bg.subtle"
        {...baseFns}
        {...extraProps}
      />
    </ChakraProvider>,
  );
}

describe("MatchCard – status badges", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows 'Pending' badge for status=pending", () => {
    renderCard({ status: "pending" });
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("shows 'In Progress' badge for status=in_progress", () => {
    renderCard({ status: "in_progress" });
    expect(screen.getByText(/in progress/i)).toBeInTheDocument();
  });

  it("shows 'Completed' badge for status=completed", () => {
    renderCard({ status: "completed" });
    expect(screen.getByText(/completed/i)).toBeInTheDocument();
  });

  it("shows 'Disputed' badge for status=disputed", () => {
    renderCard({ status: "disputed" });
    expect(screen.getByText(/disputed/i)).toBeInTheDocument();
  });
});

describe("MatchCard – W/L badges", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows W badge when p1Won=true", () => {
    renderCard(
      { status: "completed", winnerId: "p1" },
      { p1Won: true, p2Won: false },
    );
    const wBadges = screen.getAllByText("W");
    expect(wBadges.length).toBeGreaterThan(0);
  });

  it("shows L badge on player1 when winnerId is set and !p1Won", () => {
    renderCard(
      { status: "completed", winnerId: "p2" },
      { p1Won: false, p2Won: true },
    );
    expect(screen.getByText("L")).toBeInTheDocument();
  });

  it("shows W badge when p2Won=true", () => {
    renderCard(
      { status: "completed", winnerId: "p2" },
      { p1Won: false, p2Won: true },
    );
    const wBadges = screen.getAllByText("W");
    expect(wBadges.length).toBeGreaterThan(0);
  });

  it("does not show L badge for player2 when player2 is BYE", () => {
    renderCard(
      {
        status: "completed",
        winnerId: "p1",
        player2: { participantId: "bye", name: "BYE", faction: "" },
      },
      { p1Won: true, p2Won: false },
    );
    expect(screen.queryByText("L")).not.toBeInTheDocument();
  });
});

describe("MatchCard – resultOverrides button", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows 'Overridden' trigger when resultOverrides.length > 0", () => {
    renderCard({
      resultOverrides: [
        {
          previousWinnerId: null,
          newWinnerId: "p1",
          overriddenBy: "admin1",
          reason: "cheating",
          overriddenAt: new Date().toISOString(),
        },
      ],
    });
    expect(screen.getByText(/overridden/i)).toBeInTheDocument();
  });

  it("shows '2×' count prefix when resultOverrides.length > 1", () => {
    renderCard({
      resultOverrides: [
        {
          previousWinnerId: null,
          newWinnerId: "p1",
          overriddenBy: "admin1",
          reason: "",
          overriddenAt: new Date().toISOString(),
        },
        {
          previousWinnerId: "p1",
          newWinnerId: "p2",
          overriddenBy: "admin1",
          reason: "",
          overriddenAt: new Date().toISOString(),
        },
      ],
    });
    expect(screen.getByText(/2×/)).toBeInTheDocument();
  });
});

describe("MatchCard – Winner section", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows Winner section when m.winnerId is set", () => {
    renderCard({ winnerId: "p1", status: "completed" });
    expect(screen.getByText(/winner:/i)).toBeInTheDocument();
  });

  it("does not show Winner section when m.winnerId is null", () => {
    renderCard({ winnerId: null });
    expect(screen.queryByText(/winner:/i)).not.toBeInTheDocument();
  });
});

describe("MatchCard – canParticipantReport (myReport branch)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows 'Who won this match?' when no myReport", () => {
    renderCard(
      { status: "in_progress" },
      { canParticipantReport: true, myReport: undefined },
    );
    expect(screen.getByText(/who won this match/i)).toBeInTheDocument();
  });

  it("shows 'Change your reported winner:' when myReport is present", () => {
    renderCard(
      { status: "in_progress" },
      {
        canParticipantReport: true,
        myReport: {
          reportedBy: "u1",
          reportedByName: "User",
          winnerId: "p1",
        },
      },
    );
    expect(screen.getByText(/change your reported winner/i)).toBeInTheDocument();
  });
});

describe("MatchCard – isOverriding panel", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows override panel with Confirm Override button", () => {
    renderCard({}, { isOverriding: true });
    expect(screen.getByText(/override result/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /confirm override/i }),
    ).toBeInTheDocument();
  });

  it("calls onCancelOverride when Cancel is clicked", () => {
    const onCancelOverride = vi.fn();
    renderCard({}, { isOverriding: true, onCancelOverride });
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onCancelOverride).toHaveBeenCalledTimes(1);
  });

  it("shows 'overridden once' message when resultOverrides.length === 1", () => {
    renderCard(
      {
        resultOverrides: [
          {
            previousWinnerId: null,
            newWinnerId: "p1",
            overriddenBy: "admin1",
            reason: "",
            overriddenAt: new Date().toISOString(),
          },
        ],
      },
      { isOverriding: true },
    );
    expect(screen.getByText(/overridden once/i)).toBeInTheDocument();
  });

  it("shows 'N times' message when resultOverrides.length > 1", () => {
    renderCard(
      {
        resultOverrides: [
          {
            previousWinnerId: null,
            newWinnerId: "p1",
            overriddenBy: "admin1",
            reason: "",
            overriddenAt: new Date().toISOString(),
          },
          {
            previousWinnerId: "p1",
            newWinnerId: "p2",
            overriddenBy: "admin1",
            reason: "",
            overriddenAt: new Date().toISOString(),
          },
        ],
      },
      { isOverriding: true },
    );
    expect(screen.getByText(/2 times/i)).toBeInTheDocument();
  });
});

describe("MatchCard – admin record-result buttons", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows 'Record result' section for admin (not p1/p2, status=pending, player2 not BYE)", () => {
    renderCard(
      { status: "pending" },
      { isAdmin: true, isActive: true, isP1: false, isP2: false },
    );
    expect(screen.getByText(/record result/i)).toBeInTheDocument();
  });

  it("calls onRecordResult when admin clicks player1 wins", () => {
    const onRecordResult = vi.fn();
    renderCard(
      { status: "pending" },
      { isAdmin: true, isActive: true, isP1: false, isP2: false, onRecordResult },
    );
    fireEvent.click(screen.getByRole("button", { name: /grimgork wins/i }));
    expect(onRecordResult).toHaveBeenCalledWith("m1", "p1");
  });
});
