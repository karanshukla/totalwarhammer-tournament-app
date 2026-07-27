/**
 * Branch coverage for matches/components/TournamentDetail.tsx:
 * - participants.length === 0 → "No Participants Yet"
 * - participants.length > 0 → participant list shown
 * - p.faction present → faction text shown
 * - isAdmin && isPending → Add Participant panel + remove button
 * - !isAdmin || !isPending → Tournament Info card instead
 * - isFull → "Tournament is full" in add panel
 * - actionError → error box
 * - canStart (isAdmin+pending+>=2 participants) → Start Tournament button
 * - canDelete (isAdmin+pending) → Delete button
 * - status=completed → champion banner rendered (from MatchesSection tests)
 * - isActive || completed → MatchesSection shown
 * - bannedFactions.length > 0 → banned factions list
 * - enable40kFactions → 40K Beta badge
 * - editingDescription → textarea shown
 * - description present → shows description text (via ReactMarkdown mock)
 * - isAdmin && status !== completed → Edit Description button shown
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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
  default: () => null,
}));

vi.mock("@/shared/ui/Toaster", () => ({
  toaster: { create: vi.fn() },
}));

import TournamentDetail from "@/features/matches/components/TournamentDetail";
import type { Tournament } from "@/features/matches/components/types";

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
) {
  const selected = { ...baseTournament, ...tournamentOverride };
  return render(
    <MemoryRouter>
      <ChakraProvider value={defaultSystem}>
        <TournamentDetail
          selected={selected as unknown as Tournament}
          matches={[]}
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

describe("TournamentDetail – participants list", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows 'No Participants Yet' when participants array is empty", () => {
    renderDetail({ participants: [] });
    expect(screen.getByText(/no participants yet/i)).toBeInTheDocument();
  });

  it("shows participant name when participants array has entries", () => {
    renderDetail({
      participants: [{ _id: "p1", name: "Grimgork", faction: "Greenskins" }],
    });
    expect(screen.getByText("Grimgork")).toBeInTheDocument();
  });

  it("shows participant faction text when faction is set", () => {
    renderDetail({
      participants: [{ _id: "p1", name: "Grimgork", faction: "Greenskins" }],
    });
    expect(screen.getByText("Greenskins")).toBeInTheDocument();
  });
});

describe("TournamentDetail – admin + pending: Add Participant panel", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows Add Participant panel for admin in pending state", () => {
    renderDetail(
      { status: "pending" },
      { user: { id: "u1", username: "Admin" } },
    );
    expect(
      screen.getByRole("heading", { name: "Add Participant" }),
    ).toBeInTheDocument();
  });

  it("shows 'Tournament is full' when isFull", () => {
    renderDetail(
      {
        status: "pending",
        playerCount: 1,
        participants: [{ _id: "p1", name: "P1", faction: "" }],
      },
      { user: { id: "u1", username: "Admin" } },
    );
    expect(screen.getByText(/tournament is full/i)).toBeInTheDocument();
  });

  it("shows Tournament Info card when not admin or not pending", () => {
    renderDetail({ status: "active" }, { user: null });
    expect(screen.getByText("Tournament Info")).toBeInTheDocument();
  });
});

describe("TournamentDetail – canStart and canDelete buttons", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows 'Start Tournament' when admin, pending, and >= 2 participants", () => {
    renderDetail(
      {
        status: "pending",
        participants: [
          { _id: "p1", name: "P1", faction: "" },
          { _id: "p2", name: "P2", faction: "" },
        ],
      },
      { user: { id: "u1", username: "Admin" } },
    );
    expect(
      screen.getByRole("button", { name: /start tournament/i }),
    ).toBeInTheDocument();
  });

  it("shows 'Delete' when admin and pending", () => {
    renderDetail(
      { status: "pending" },
      { user: { id: "u1", username: "Admin" } },
    );
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
  });

  it("hides 'Delete' when not admin", () => {
    renderDetail({ status: "pending" }, { user: null });
    expect(
      screen.queryByRole("button", { name: /^delete$/i }),
    ).not.toBeInTheDocument();
  });
});

describe("TournamentDetail – actionError", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows error box when actionError is set", () => {
    renderDetail({}, { actionError: "Something went wrong" });
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });
});

describe("TournamentDetail – MatchesSection visibility", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows MatchesSection when status is active", () => {
    renderDetail({ status: "active" });
    expect(screen.getByTestId("matches-section")).toBeInTheDocument();
  });

  it("shows MatchesSection when status is completed", () => {
    renderDetail({ status: "completed" });
    expect(screen.getByTestId("matches-section")).toBeInTheDocument();
  });

  it("does NOT show MatchesSection when status is pending", () => {
    renderDetail({ status: "pending" });
    expect(screen.queryByTestId("matches-section")).not.toBeInTheDocument();
  });
});

describe("TournamentDetail – banned factions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows 'Banned Factions' section when bannedFactions is non-empty", () => {
    renderDetail({
      bannedFactions: ["Greenskins"],
      status: "active",
    });
    expect(screen.getByText("Greenskins")).toBeInTheDocument();
  });
});

describe("TournamentDetail – enable40kFactions badge", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows '40K Beta' badge when enable40kFactions is true", () => {
    renderDetail({ enable40kFactions: true });
    expect(screen.getByText(/40k beta/i)).toBeInTheDocument();
  });

  it("does not show '40K Beta' badge when enable40kFactions is false", () => {
    renderDetail({ enable40kFactions: false });
    expect(screen.queryByText(/40k beta/i)).not.toBeInTheDocument();
  });
});

describe("TournamentDetail – Edit Description panel", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows 'Edit Description' button for admin when status is not completed", () => {
    renderDetail(
      { status: "pending", description: "" },
      { user: { id: "u1", username: "Admin" } },
    );
    expect(
      screen.getByRole("button", { name: /edit description/i }),
    ).toBeInTheDocument();
  });

  it("shows 'No description' hint when isAdmin, no description, and status != completed", () => {
    renderDetail(
      { status: "pending", description: "" },
      { user: { id: "u1", username: "Admin" } },
    );
    expect(screen.getByText(/no description/i)).toBeInTheDocument();
  });

  it("shows textarea when 'Edit Description' is clicked", async () => {
    renderDetail(
      { status: "pending", description: "" },
      { user: { id: "u1", username: "Admin" } },
    );
    fireEvent.click(screen.getByRole("button", { name: /edit description/i }));
    await waitFor(() =>
      expect(
        screen.getByPlaceholderText(/tournament description/i),
      ).toBeInTheDocument(),
    );
  });

  it("cancels editing on Escape, hiding the textarea (issue #144)", async () => {
    renderDetail(
      { status: "pending", description: "" },
      { user: { id: "u1", username: "Admin" } },
    );
    fireEvent.click(screen.getByRole("button", { name: /edit description/i }));
    await waitFor(() =>
      expect(
        screen.getByPlaceholderText(/tournament description/i),
      ).toBeInTheDocument(),
    );

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() =>
      expect(
        screen.queryByPlaceholderText(/tournament description/i),
      ).not.toBeInTheDocument(),
    );
    // The Edit button reappears once the editor is closed.
    expect(
      screen.getByRole("button", { name: /edit description/i }),
    ).toBeInTheDocument();
  });

  it("does not cancel on Escape when the editor is closed (issue #144)", () => {
    renderDetail(
      { status: "pending", description: "" },
      { user: { id: "u1", username: "Admin" } },
    );
    fireEvent.keyDown(document, { key: "Escape" });
    // Editor never opened, so the textarea is absent and Edit button present.
    expect(
      screen.queryByPlaceholderText(/tournament description/i),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /edit description/i }),
    ).toBeInTheDocument();
  });

  it("shows rendered markdown when description is set and not editing", () => {
    renderDetail(
      { status: "active", description: "# My Tournament" },
      { user: null },
    );
    expect(screen.getByTestId("markdown")).toBeInTheDocument();
  });
});
