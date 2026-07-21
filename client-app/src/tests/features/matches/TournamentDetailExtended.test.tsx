/**
 * Extended branch coverage for matches/components/TournamentDetail.tsx
 * Covers branches not in TournamentDetail.test.tsx:
 * - handleCopyCode → navigator.clipboard.writeText + codeCopied state
 * - handleUpdateDescription → onSaveDescription called, editingDescription reset
 * - Cancel editing description → editingDescription set to false
 * - canAdvance / Advance Round button
 * - Champion section (status=completed, match with winner)
 * - Current Round in Tournament Info
 * - Admin pencil button → opens edit dialog
 * - Admin remove participant button (X) → calls onRemoveParticipant
 * - Tournament Info champion row (status=completed)
 * - Finalize Tournament label for Round Robin
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { MemoryRouter } from "react-router-dom";

const { mockNavigate } = vi.hoisted(() => ({ mockNavigate: vi.fn() }));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("react-markdown", () => ({
  default: ({ children }: { children: string }) => (
    <div data-testid="markdown">{children}</div>
  ),
}));

vi.mock("@/features/matches/components/MatchesSection", () => ({
  default: () => <div data-testid="matches-section" />,
}));

vi.mock("@/features/matches/components/EditParticipantDialog", () => ({
  default: ({ open }: { open: boolean }) =>
    open ? <div data-testid="edit-dialog" /> : null,
}));

vi.mock("@/shared/ui/Toaster", () => ({
  toaster: { create: vi.fn() },
}));

import TournamentDetail from "@/features/matches/components/TournamentDetail";
import type { Match, Tournament } from "@/features/matches/components/types";

// ─── Shared test fixtures ─────────────────────────────────────────────────────

const baseTournament = {
  _id: "t1",
  name: "Test Cup",
  code: "ABCDEF",
  description: "",
  playerCount: 4,
  tournamentType: "Single Elimination",
  bannedFactions: [] as string[],
  enable40kFactions: false,
  participants: [] as {
    _id: string;
    name: string;
    faction: string;
    userId?: string | null;
  }[],
  status: "pending" as "pending" | "active" | "completed",
  createdAt: new Date().toISOString(),
  createdBy: "u1",
};

const baseMatch: Match = {
  _id: "m1",
  round: 1,
  matchNumber: 1,
  player1: { participantId: "p1", name: "Champ", faction: "Greenskins" },
  player2: { participantId: "p2", name: "Other", faction: "Empire" },
  winnerId: null,
  loserId: null,
  status: "pending",
  notes: "",
  reportedResults: [],
  resultOverrides: [],
  completedAt: null,
  bracketSide: null,
};

const baseFns = {
  onBack: vi.fn(),
  onStart: vi.fn(),
  onDelete: vi.fn(),
  onAddParticipant: vi.fn(),
  onRemoveParticipant: vi.fn(),
  onRecordResult: vi.fn(),
  onReportResult: vi.fn(),
  onOverrideResult: vi.fn().mockResolvedValue(undefined),
  onResolveDispute: vi.fn(),
  onAdvanceRound: vi.fn(),
  onSaveDescription: vi.fn().mockResolvedValue(undefined),
  onSaveParticipant: vi.fn().mockResolvedValue(undefined),
  onSetNewName: vi.fn(),
  onSetNewFaction: vi.fn(),
};

function renderDetail(
  tournamentOverride: Partial<typeof baseTournament> = {},
  extraProps: Record<string, unknown> = {},
  matches: Match[] = [],
) {
  const selected = { ...baseTournament, ...tournamentOverride };
  return render(
    <MemoryRouter>
      <ChakraProvider value={defaultSystem}>
        <TournamentDetail
          selected={selected as unknown as Tournament}
          matches={matches}
          user={null}
          newName=""
          newFaction=""
          actionLoading={false}
          actionError={null}
          matchLoading={false}
          {...baseFns}
          {...extraProps}
        />
      </ChakraProvider>
    </MemoryRouter>,
  );
}

// ─── handleCopyCode ───────────────────────────────────────────────────────────

describe("TournamentDetail – handleCopyCode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it("calls navigator.clipboard.writeText with the tournament code on Copy click", async () => {
    renderDetail({ code: "ABCDEF" });
    const copyBtn = screen.getByRole("button", { name: /^copy$/i });
    fireEvent.click(copyBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("ABCDEF");
  });

  it("shows 'Copied!' after clicking the Copy button", async () => {
    renderDetail({ code: "ABCDEF" });
    const copyBtn = screen.getByRole("button", { name: /^copy$/i });
    fireEvent.click(copyBtn);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /copied!/i }),
      ).toBeInTheDocument(),
    );
  });

  it("resets to 'Copy' after 2 seconds", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      renderDetail({ code: "ABCDEF" });
      const copyBtn = screen.getByRole("button", { name: /^copy$/i });
      fireEvent.click(copyBtn);
      // 'Copied!' should appear immediately (synchronous state update)
      expect(
        screen.getByRole("button", { name: /copied!/i }),
      ).toBeInTheDocument();
      // Advance past the 2000ms timeout
      act(() => {
        vi.advanceTimersByTime(2100);
      });
      expect(
        screen.getByRole("button", { name: /^copy$/i }),
      ).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});

// ─── handleUpdateDescription ──────────────────────────────────────────────────

describe("TournamentDetail – handleUpdateDescription", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls onSaveDescription with the draft text and closes the editor", async () => {
    const onSaveDescription = vi.fn().mockResolvedValue(undefined);
    renderDetail(
      { status: "active", description: "" },
      { user: { id: "u1", username: "Admin" }, onSaveDescription },
    );

    fireEvent.click(screen.getByRole("button", { name: /edit description/i }));

    const textarea = screen.getByPlaceholderText(/tournament description/i);
    fireEvent.change(textarea, { target: { value: "My tournament rules" } });

    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => {
      expect(onSaveDescription).toHaveBeenCalledWith("My tournament rules");
    });
    // After saving, the textarea should no longer be visible
    await waitFor(() =>
      expect(
        screen.queryByPlaceholderText(/tournament description/i),
      ).not.toBeInTheDocument(),
    );
  });
});

// ─── Cancel editing description ───────────────────────────────────────────────

describe("TournamentDetail – cancel editing description", () => {
  beforeEach(() => vi.clearAllMocks());

  it("hides textarea when Cancel is clicked", async () => {
    renderDetail(
      { status: "active", description: "" },
      { user: { id: "u1", username: "Admin" } },
    );

    fireEvent.click(screen.getByRole("button", { name: /edit description/i }));
    expect(
      screen.getByPlaceholderText(/tournament description/i),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));

    await waitFor(() =>
      expect(
        screen.queryByPlaceholderText(/tournament description/i),
      ).not.toBeInTheDocument(),
    );
  });
});

// ─── canAdvance / Advance Round button ───────────────────────────────────────

describe("TournamentDetail – canAdvance (Advance Round)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows 'Advance Round' button when all matches in max round are completed", () => {
    const completedMatch: Match = {
      ...baseMatch,
      winnerId: "p1",
      status: "completed",
    };
    renderDetail(
      { status: "active" },
      { user: { id: "u1", username: "Admin" } },
      [completedMatch],
    );
    expect(
      screen.getByRole("button", { name: /advance round/i }),
    ).toBeInTheDocument();
  });

  it("calls onAdvanceRound when 'Advance Round' is clicked", () => {
    const onAdvanceRound = vi.fn();
    const completedMatch: Match = {
      ...baseMatch,
      winnerId: "p1",
      status: "completed",
    };
    renderDetail(
      { status: "active" },
      { user: { id: "u1", username: "Admin" }, onAdvanceRound },
      [completedMatch],
    );
    fireEvent.click(screen.getByRole("button", { name: /advance round/i }));
    expect(onAdvanceRound).toHaveBeenCalledTimes(1);
  });

  it("does NOT show 'Advance Round' when a match is still pending", () => {
    renderDetail(
      { status: "active" },
      { user: { id: "u1", username: "Admin" } },
      [baseMatch], // status: "pending"
    );
    expect(
      screen.queryByRole("button", { name: /advance round/i }),
    ).not.toBeInTheDocument();
  });

  it("does NOT show 'Advance Round' when matches array is empty", () => {
    renderDetail(
      { status: "active" },
      { user: { id: "u1", username: "Admin" } },
      [],
    );
    expect(
      screen.queryByRole("button", { name: /advance round/i }),
    ).not.toBeInTheDocument();
  });
});

// ─── Finalize Tournament label for Round Robin ────────────────────────────────

describe("TournamentDetail – Finalize Tournament label (Round Robin)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows 'Finalize Tournament' instead of 'Advance Round' for Round Robin type", () => {
    const completedMatch: Match = {
      ...baseMatch,
      winnerId: "p1",
      status: "completed",
    };
    renderDetail(
      { status: "active", tournamentType: "Round Robin" },
      { user: { id: "u1", username: "Admin" } },
      [completedMatch],
    );
    expect(
      screen.getByRole("button", { name: /finalize tournament/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /advance round/i }),
    ).not.toBeInTheDocument();
  });
});

// ─── Champion section (status=completed) ─────────────────────────────────────

describe("TournamentDetail – champion banner (status=completed)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows 'Tournament Champion' banner with winner name when status is completed", () => {
    const completedMatch: Match = {
      ...baseMatch,
      winnerId: "p1",
      status: "completed",
    };
    renderDetail({ status: "completed" }, {}, [completedMatch]);
    expect(screen.getByText(/tournament champion/i)).toBeInTheDocument();
    expect(screen.getAllByText("Champ").length).toBeGreaterThan(0);
  });

  it("does NOT show champion banner when completed but no match has a winner", () => {
    const pendingMatch: Match = { ...baseMatch, winnerId: null };
    renderDetail({ status: "completed" }, {}, [pendingMatch]);
    expect(screen.queryByText(/tournament champion/i)).not.toBeInTheDocument();
  });

  it("does NOT show champion banner when status is not completed", () => {
    const completedMatch: Match = {
      ...baseMatch,
      winnerId: "p1",
      status: "completed",
    };
    renderDetail({ status: "active" }, {}, [completedMatch]);
    expect(screen.queryByText(/tournament champion/i)).not.toBeInTheDocument();
  });
});

// ─── Tournament Info champion row ─────────────────────────────────────────────

describe("TournamentDetail – Tournament Info champion row", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows 'Champion' label in Tournament Info card when completed with a winner", () => {
    const completedMatch: Match = {
      ...baseMatch,
      winnerId: "p1",
      status: "completed",
    };
    // Need non-admin so we get the Tournament Info card (not Add Participant)
    renderDetail({ status: "completed" }, { user: null }, [completedMatch]);
    // "Champion" appears as a label in the info card
    expect(screen.getByText("Champion")).toBeInTheDocument();
  });

  it("shows '-' as champion when no match has winnerId", () => {
    const match: Match = { ...baseMatch, winnerId: null };
    renderDetail({ status: "completed" }, { user: null }, [match]);
    // The IIFE returns <Text fontWeight="medium">-</Text>
    expect(screen.getByText("-")).toBeInTheDocument();
  });
});

// ─── Current Round in Tournament Info ────────────────────────────────────────

describe("TournamentDetail – Current Round in Tournament Info", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows 'Current Round' row when active and matches exist (non-Round Robin)", () => {
    const match: Match = { ...baseMatch, bracketSide: null };
    // Non-admin → Tournament Info card is rendered
    renderDetail(
      { status: "active", tournamentType: "Single Elimination" },
      { user: null },
      [match],
    );
    expect(screen.getByText("Current Round")).toBeInTheDocument();
  });

  it("does NOT show 'Current Round' for Round Robin type", () => {
    const match: Match = { ...baseMatch, bracketSide: null };
    renderDetail(
      { status: "active", tournamentType: "Round Robin" },
      { user: null },
      [match],
    );
    expect(screen.queryByText("Current Round")).not.toBeInTheDocument();
  });

  it("does NOT show 'Current Round' when there are no matches", () => {
    renderDetail(
      { status: "active", tournamentType: "Single Elimination" },
      { user: null },
      [],
    );
    expect(screen.queryByText("Current Round")).not.toBeInTheDocument();
  });
});

// ─── Admin edit participant pencil button ────────────────────────────────────

describe("TournamentDetail – admin edit participant button", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows the edit dialog when pencil button is clicked", () => {
    renderDetail(
      {
        status: "active", // non-pending so we get Tournament Info card not Add Participant
        participants: [{ _id: "p1", name: "Grimgork", faction: "Greenskins" }],
      },
      { user: { id: "u1", username: "Admin" } },
    );

    // Edit dialog is hidden initially
    expect(screen.queryByTestId("edit-dialog")).not.toBeInTheDocument();

    const editBtn = screen.getByRole("button", { name: /edit participant/i });
    fireEvent.click(editBtn);

    // React state update is synchronous via fireEvent, dialog opens
    expect(screen.getByTestId("edit-dialog")).toBeInTheDocument();
  });
});

// ─── Admin remove participant button ─────────────────────────────────────────

describe("TournamentDetail – admin remove participant button", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls onRemoveParticipant with participant _id when X is clicked", () => {
    const onRemoveParticipant = vi.fn();
    renderDetail(
      {
        status: "pending",
        participants: [{ _id: "p1", name: "Grimgork", faction: "Greenskins" }],
      },
      { user: { id: "u1", username: "Admin" }, onRemoveParticipant },
    );

    const removeBtn = screen.getByRole("button", {
      name: /remove participant/i,
    });
    fireEvent.click(removeBtn);
    expect(onRemoveParticipant).toHaveBeenCalledWith("p1");
  });

  it("does NOT show remove button when not admin", () => {
    renderDetail(
      {
        status: "pending",
        participants: [{ _id: "p1", name: "Grimgork", faction: "Greenskins" }],
      },
      { user: null },
    );
    expect(
      screen.queryByRole("button", { name: /remove participant/i }),
    ).not.toBeInTheDocument();
  });

  it("does NOT show remove button when status is not pending (active)", () => {
    renderDetail(
      {
        status: "active",
        participants: [{ _id: "p1", name: "Grimgork", faction: "Greenskins" }],
      },
      { user: { id: "u1", username: "Admin" } },
    );
    expect(
      screen.queryByRole("button", { name: /remove participant/i }),
    ).not.toBeInTheDocument();
  });
});
