/**
 * Additional branch coverage for matches/components/MatchCard.tsx:
 * - Lines 336-379: isAdmin && isActive && m.status === "disputed" section
 * - Lines 381-408: isAdmin && isActive && m.status === "in_progress" && reportedResults.length > 0
 * - Lines 441-450: Admin Override start button (isAdmin && isActive && player2.name !== "BYE")
 * - Lines 512-522: !isAdmin && (isP1||isP2) && status === "in_progress" && myReport → "waiting for opponent"
 * - Lines 523-533: !isAdmin && (isP1||isP2) && status === "disputed" → "Result disputed"
 * - Override panel: clicking winner buttons (onSetOverrideWinner), confirm override, typing reason
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

// ─── Lines 336-379: admin disputed section ────────────────────────────────────

describe("MatchCard – admin disputed resolution (lines 336-379)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows '⚠ Disputed - resolve:' label for admin + active + disputed", () => {
    renderCard(
      { status: "disputed" },
      { isAdmin: true, isActive: true },
    );
    expect(screen.getByText(/disputed - resolve/i)).toBeInTheDocument();
  });

  it("renders player1-wins and player2-wins resolve buttons", () => {
    renderCard(
      { status: "disputed" },
      { isAdmin: true, isActive: true },
    );
    expect(
      screen.getByRole("button", { name: /grimgork wins/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /luthor wins/i }),
    ).toBeInTheDocument();
  });

  it("calls onResolveDispute with matchId and player1 participantId when p1-wins clicked", () => {
    const onResolveDispute = vi.fn();
    renderCard(
      { status: "disputed" },
      { isAdmin: true, isActive: true, onResolveDispute },
    );
    fireEvent.click(screen.getByRole("button", { name: /grimgork wins/i }));
    expect(onResolveDispute).toHaveBeenCalledWith("m1", "p1");
  });

  it("calls onResolveDispute with matchId and player2 participantId when p2-wins clicked", () => {
    const onResolveDispute = vi.fn();
    renderCard(
      { status: "disputed" },
      { isAdmin: true, isActive: true, onResolveDispute },
    );
    fireEvent.click(screen.getByRole("button", { name: /luthor wins/i }));
    expect(onResolveDispute).toHaveBeenCalledWith("m1", "p2");
  });

  it("shows reportedResults 'X says Y won' text in disputed section", () => {
    renderCard(
      {
        status: "disputed",
        reportedResults: [
          { reportedBy: "p1", reportedByName: "Grimgork", winnerId: "p1" },
          { reportedBy: "p2", reportedByName: "Luthor", winnerId: "p2" },
        ],
      },
      { isAdmin: true, isActive: true },
    );
    // "Grimgork says Grimgork won" → each reporter's claimed winner displayed
    const saysPhrases = screen.getAllByText(/says/i);
    expect(saysPhrases.length).toBeGreaterThanOrEqual(2);
  });

  it("resolves reporter name from player1 participantId when reportedBy matches p1", () => {
    renderCard(
      {
        status: "disputed",
        reportedResults: [
          { reportedBy: "p1", reportedByName: "SomeOther", winnerId: "p1" },
        ],
      },
      { isAdmin: true, isActive: true },
    );
    // Reporter is p1 → name resolves to player1.name "Grimgork"; "SomeOther" should NOT appear
    expect(screen.queryByText(/someother/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/grimgork/i).length).toBeGreaterThan(0);
  });

  it("does NOT show disputed-resolve section when not admin", () => {
    renderCard(
      { status: "disputed" },
      { isAdmin: false, isActive: true },
    );
    expect(screen.queryByText(/disputed - resolve/i)).not.toBeInTheDocument();
  });

  it("does NOT show disputed-resolve section when isActive is false", () => {
    renderCard(
      { status: "disputed" },
      { isAdmin: true, isActive: false },
    );
    expect(screen.queryByText(/disputed - resolve/i)).not.toBeInTheDocument();
  });
});

// ─── Lines 381-408: admin in_progress reported results ───────────────────────

describe("MatchCard – admin in_progress reported results (lines 381-408)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows 'Reported results (1/2):' label for admin + active + in_progress + 1 report", () => {
    renderCard(
      {
        status: "in_progress",
        reportedResults: [
          { reportedBy: "p1", reportedByName: "Grimgork", winnerId: "p1" },
        ],
      },
      { isAdmin: true, isActive: true },
    );
    expect(screen.getByText(/reported results \(1\/2\)/i)).toBeInTheDocument();
  });

  it("shows 'Reported results (2/2):' label when both have reported", () => {
    renderCard(
      {
        status: "in_progress",
        reportedResults: [
          { reportedBy: "p1", reportedByName: "Grimgork", winnerId: "p1" },
          { reportedBy: "p2", reportedByName: "Luthor", winnerId: "p1" },
        ],
      },
      { isAdmin: true, isActive: true },
    );
    expect(screen.getByText(/reported results \(2\/2\)/i)).toBeInTheDocument();
  });

  it("shows 'X says Y won' for each reported result", () => {
    renderCard(
      {
        status: "in_progress",
        reportedResults: [
          { reportedBy: "p1", reportedByName: "Grimgork", winnerId: "p2" },
        ],
      },
      { isAdmin: true, isActive: true },
    );
    // p1 (Grimgork) says p2 (Luthor) won
    const sayPhrases = screen.getAllByText(/says/i);
    expect(sayPhrases.length).toBeGreaterThanOrEqual(1);
  });

  it("resolves reporter name to player2.name when reportedBy matches p2", () => {
    renderCard(
      {
        status: "in_progress",
        reportedResults: [
          { reportedBy: "p2", reportedByName: "FallbackName", winnerId: "p1" },
        ],
      },
      { isAdmin: true, isActive: true },
    );
    // Reporter is p2 → name resolves to player2.name "Luthor"; "FallbackName" should NOT appear
    expect(screen.queryByText(/fallbackname/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/luthor/i).length).toBeGreaterThan(0);
  });

  it("falls back to reportedByName when reportedBy does not match either participant", () => {
    renderCard(
      {
        status: "in_progress",
        reportedResults: [
          { reportedBy: "unknown-id", reportedByName: "Stranger", winnerId: "p1" },
        ],
      },
      { isAdmin: true, isActive: true },
    );
    expect(screen.getByText(/stranger/i)).toBeInTheDocument();
  });

  it("does NOT show reported results section when reportedResults is empty", () => {
    renderCard(
      { status: "in_progress", reportedResults: [] },
      { isAdmin: true, isActive: true },
    );
    expect(screen.queryByText(/reported results/i)).not.toBeInTheDocument();
  });

  it("does NOT show reported results section when not admin", () => {
    renderCard(
      {
        status: "in_progress",
        reportedResults: [
          { reportedBy: "p1", reportedByName: "Grimgork", winnerId: "p1" },
        ],
      },
      { isAdmin: false, isActive: true },
    );
    expect(screen.queryByText(/reported results/i)).not.toBeInTheDocument();
  });
});

// ─── Lines 441-450: Admin Override start button ───────────────────────────────

describe("MatchCard – admin Override button (lines 441-450)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders Override button for admin + active + player2 not BYE", () => {
    renderCard(
      { status: "in_progress" },
      { isAdmin: true, isActive: true },
    );
    expect(screen.getByRole("button", { name: /override/i })).toBeInTheDocument();
  });

  it("calls onStartOverride when the Override button is clicked", () => {
    const onStartOverride = vi.fn();
    renderCard(
      { status: "in_progress" },
      { isAdmin: true, isActive: true, onStartOverride },
    );
    fireEvent.click(screen.getByRole("button", { name: /override/i }));
    expect(onStartOverride).toHaveBeenCalledTimes(1);
  });

  it("does NOT render Override button when player2 is BYE", () => {
    renderCard(
      {
        status: "in_progress",
        player2: { participantId: "bye", name: "BYE", faction: "" },
      },
      { isAdmin: true, isActive: true },
    );
    expect(screen.queryByRole("button", { name: /override/i })).not.toBeInTheDocument();
  });

  it("does NOT render Override button when isAdmin is false", () => {
    renderCard(
      { status: "in_progress" },
      { isAdmin: false, isActive: true },
    );
    expect(screen.queryByRole("button", { name: /override/i })).not.toBeInTheDocument();
  });

  it("does NOT render Override button when isActive is false", () => {
    renderCard(
      { status: "in_progress" },
      { isAdmin: true, isActive: false },
    );
    expect(screen.queryByRole("button", { name: /override/i })).not.toBeInTheDocument();
  });

  it("renders Override button even for completed matches", () => {
    renderCard(
      { status: "completed", winnerId: "p1" },
      { isAdmin: true, isActive: true, p1Won: true },
    );
    expect(screen.getByRole("button", { name: /override/i })).toBeInTheDocument();
  });
});

// ─── Lines 512-522: participant "waiting for opponent" message ────────────────

describe("MatchCard – participant 'waiting for opponent' message (lines 512-522)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows 'waiting for opponent' text for isP1 + in_progress + myReport present", () => {
    renderCard(
      { status: "in_progress" },
      {
        isAdmin: false,
        isP1: true,
        isP2: false,
        myReport: { reportedBy: "p1", reportedByName: "Grimgork", winnerId: "p1" },
      },
    );
    expect(screen.getByText(/waiting for opponent/i)).toBeInTheDocument();
  });

  it("shows 'waiting for opponent' text for isP2 + in_progress + myReport present", () => {
    renderCard(
      { status: "in_progress" },
      {
        isAdmin: false,
        isP1: false,
        isP2: true,
        myReport: { reportedBy: "p2", reportedByName: "Luthor", winnerId: "p2" },
      },
    );
    expect(screen.getByText(/waiting for opponent/i)).toBeInTheDocument();
  });

  it("shows the reported winner's name in the 'waiting' message (p1 reported p1 won)", () => {
    renderCard(
      { status: "in_progress" },
      {
        isAdmin: false,
        isP1: true,
        myReport: { reportedBy: "p1", reportedByName: "Grimgork", winnerId: "p1" },
      },
    );
    // The "waiting for opponent" sentence contains the winner name
    expect(screen.getByText(/as winner - waiting for opponent/i)).toBeInTheDocument();
    // The parent paragraph contains "Grimgork" as the reported winner
    const waitingEl = screen.getByText(/as winner - waiting for opponent/i);
    expect(waitingEl.textContent).toMatch(/grimgork/i);
  });

  it("shows the reported winner's name when p1 reported p2 won", () => {
    renderCard(
      { status: "in_progress" },
      {
        isAdmin: false,
        isP1: true,
        myReport: { reportedBy: "p1", reportedByName: "Grimgork", winnerId: "p2" },
      },
    );
    const waitingEl = screen.getByText(/as winner - waiting for opponent/i);
    expect(waitingEl.textContent).toMatch(/luthor/i);
  });

  it("does NOT show 'waiting for opponent' when myReport is undefined", () => {
    renderCard(
      { status: "in_progress" },
      {
        isAdmin: false,
        isP1: true,
        myReport: undefined,
      },
    );
    expect(screen.queryByText(/waiting for opponent/i)).not.toBeInTheDocument();
  });

  it("does NOT show 'waiting for opponent' when neither isP1 nor isP2", () => {
    renderCard(
      { status: "in_progress" },
      {
        isAdmin: false,
        isP1: false,
        isP2: false,
        myReport: { reportedBy: "p1", reportedByName: "Grimgork", winnerId: "p1" },
      },
    );
    expect(screen.queryByText(/waiting for opponent/i)).not.toBeInTheDocument();
  });

  it("does NOT show 'waiting for opponent' when isAdmin is true", () => {
    renderCard(
      { status: "in_progress" },
      {
        isAdmin: true,
        isP1: true,
        myReport: { reportedBy: "p1", reportedByName: "Grimgork", winnerId: "p1" },
      },
    );
    expect(screen.queryByText(/waiting for opponent/i)).not.toBeInTheDocument();
  });
});

// ─── Lines 523-533: participant "Result disputed" message ─────────────────────

describe("MatchCard – participant 'Result disputed' message (lines 523-533)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows disputed message for isP1 + status=disputed + !isAdmin", () => {
    renderCard(
      { status: "disputed" },
      { isAdmin: false, isP1: true, isP2: false },
    );
    expect(
      screen.getByText(/result disputed.*awaiting organiser/i),
    ).toBeInTheDocument();
  });

  it("shows disputed message for isP2 + status=disputed + !isAdmin", () => {
    renderCard(
      { status: "disputed" },
      { isAdmin: false, isP1: false, isP2: true },
    );
    expect(
      screen.getByText(/result disputed.*awaiting organiser/i),
    ).toBeInTheDocument();
  });

  it("does NOT show disputed message when isAdmin is true", () => {
    renderCard(
      { status: "disputed" },
      { isAdmin: true, isP1: true },
    );
    // Admin gets resolve buttons instead, not the "awaiting organiser" text
    expect(
      screen.queryByText(/awaiting organiser decision/i),
    ).not.toBeInTheDocument();
  });

  it("does NOT show disputed message when neither isP1 nor isP2", () => {
    renderCard(
      { status: "disputed" },
      { isAdmin: false, isP1: false, isP2: false },
    );
    expect(
      screen.queryByText(/awaiting organiser decision/i),
    ).not.toBeInTheDocument();
  });

  it("does NOT show disputed message when status is in_progress", () => {
    renderCard(
      { status: "in_progress" },
      { isAdmin: false, isP1: true },
    );
    expect(
      screen.queryByText(/awaiting organiser decision/i),
    ).not.toBeInTheDocument();
  });
});

// ─── Override panel interactions ──────────────────────────────────────────────

describe("MatchCard – override panel interactions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls onSetOverrideWinner with p1 participantId when Grimgork button is clicked", () => {
    const onSetOverrideWinner = vi.fn();
    renderCard({}, { isOverriding: true, onSetOverrideWinner });
    // In the override panel player buttons render with dn(player1.name) = "Grimgork"
    // There are two "Grimgork" buttons: one in the override panel HStack, one in participant section if visible
    const buttons = screen.getAllByRole("button", { name: /grimgork/i });
    // Click the first one (override panel winner button)
    fireEvent.click(buttons[0]);
    expect(onSetOverrideWinner).toHaveBeenCalledWith("p1");
  });

  it("calls onSetOverrideWinner with p2 participantId when Luthor button is clicked", () => {
    const onSetOverrideWinner = vi.fn();
    renderCard({}, { isOverriding: true, onSetOverrideWinner });
    const buttons = screen.getAllByRole("button", { name: /luthor/i });
    fireEvent.click(buttons[0]);
    expect(onSetOverrideWinner).toHaveBeenCalledWith("p2");
  });

  it("calls onConfirmOverride when Confirm Override is clicked", () => {
    const onConfirmOverride = vi.fn();
    renderCard(
      {},
      { isOverriding: true, overrideWinnerId: "p1", onConfirmOverride },
    );
    fireEvent.click(screen.getByRole("button", { name: /confirm override/i }));
    expect(onConfirmOverride).toHaveBeenCalledTimes(1);
  });

  it("calls onSetOverrideReason when text is typed in the reason input", () => {
    const onSetOverrideReason = vi.fn();
    renderCard({}, { isOverriding: true, onSetOverrideReason });
    const input = screen.getByPlaceholderText(/reason \(optional\)/i);
    fireEvent.change(input, { target: { value: "Cheating observed" } });
    expect(onSetOverrideReason).toHaveBeenCalledWith("Cheating observed");
  });

  it("Confirm Override button is disabled when overrideWinnerId is empty", () => {
    renderCard({}, { isOverriding: true, overrideWinnerId: "" });
    const confirmBtn = screen.getByRole("button", { name: /confirm override/i });
    expect(confirmBtn).toBeDisabled();
  });

  it("Confirm Override button is enabled when overrideWinnerId is set", () => {
    renderCard({}, { isOverriding: true, overrideWinnerId: "p1" });
    const confirmBtn = screen.getByRole("button", { name: /confirm override/i });
    expect(confirmBtn).not.toBeDisabled();
  });

  it("shows player name buttons in override winner selection panel", () => {
    renderCard({}, { isOverriding: true });
    expect(screen.getByRole("button", { name: /grimgork/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /luthor/i })).toBeInTheDocument();
  });
});
