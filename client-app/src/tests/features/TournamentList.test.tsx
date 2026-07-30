import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { BrowserRouter } from "react-router";
import TournamentList from "@/features/matches/components/TournamentList";
import { Tournament } from "@/features/matches/components/types";

const baseProps = {
  page: 1,
  total: 0,
  pageSize: 12,
  statusFilter: "all" as "all" | "pending" | "active" | "completed",
  listLoading: false,
  error: null,
  codeInput: "",
  codeLoading: false,
  codeError: null,
  isAuthenticated: true,
  onSelectTournament: vi.fn(),
  onFindByCode: vi.fn(),
  onCodeInputChange: vi.fn(),
  onStatusFilterChange: vi.fn(),
  onPageChange: vi.fn(),
};

const emptyStatusCounts = { all: 0, pending: 0, active: 0, completed: 0 };

function makeTournament(overrides: Partial<Tournament> = {}): Tournament {
  return {
    _id: "t1",
    name: "Test Cup",
    code: "ABC123",
    description: "",
    playerCount: 8,
    tournamentType: "Single Elimination",
    bannedFactions: [],
    enable40kFactions: false,
    participants: [],
    status: "active",
    createdAt: "2026-01-01",
    createdBy: "user1",
    ...overrides,
  };
}

function renderList(
  props: Partial<typeof baseProps> & {
    tournaments: Tournament[];
    statusCounts: typeof emptyStatusCounts;
  },
) {
  return render(
    <BrowserRouter>
      <ChakraProvider value={defaultSystem}>
        <TournamentList {...baseProps} {...props} />
      </ChakraProvider>
    </BrowserRouter>,
  );
}

describe("TournamentList filter buttons", () => {
  it("hides filter buttons when there are no tournaments at all", () => {
    renderList({ tournaments: [], statusCounts: emptyStatusCounts });
    expect(
      screen.queryByRole("button", { name: /all/i }),
    ).not.toBeInTheDocument();
  });

  it("shows filter buttons when tournaments exist", () => {
    const tournaments = [makeTournament()];
    const statusCounts = { all: 1, pending: 0, active: 1, completed: 0 };
    renderList({ tournaments, statusCounts });
    expect(screen.getByRole("button", { name: /all/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /active/i })).toBeInTheDocument();
  });

  it("keeps filter buttons visible when the active filter returns zero results", () => {
    // statusCounts.all > 0 means tournaments exist, but filtered list is empty
    const statusCounts = { all: 1, pending: 0, active: 0, completed: 0 };
    renderList({
      tournaments: [],
      statusCounts,
      statusFilter: "active",
      total: 0,
    });
    // Check unambiguous filter button names (not "Show all")
    expect(
      screen.getByRole("button", { name: /pending/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /completed/i }),
    ).toBeInTheDocument();
    // Both the "All" filter button and "Show all" button should be present
    expect(screen.getAllByRole("button", { name: /all/i })).toHaveLength(2);
  });

  it("shows no-results message with Show all button when filter returns empty", () => {
    const statusCounts = { all: 1, pending: 0, active: 0, completed: 0 };
    renderList({
      tournaments: [],
      statusCounts,
      statusFilter: "active",
      total: 0,
    });
    expect(screen.getByText(/no active tournaments/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /show all/i }),
    ).toBeInTheDocument();
  });

  it("calls onStatusFilterChange with 'all' when Show all is clicked", async () => {
    const onStatusFilterChange = vi.fn();
    const statusCounts = { all: 1, pending: 1, active: 0, completed: 0 };
    renderList({
      tournaments: [],
      statusCounts,
      statusFilter: "active",
      total: 0,
      onStatusFilterChange,
    });
    await userEvent.click(screen.getByRole("button", { name: /show all/i }));
    expect(onStatusFilterChange).toHaveBeenCalledWith("all");
  });

  it("shows generic empty state when there are truly no tournaments", () => {
    renderList({ tournaments: [], statusCounts: emptyStatusCounts });
    expect(
      screen.getByText(/haven't created or joined any tournaments/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /show all/i }),
    ).not.toBeInTheDocument();
  });

  it("shows the 40K Beta badge when enable40kFactions is true", () => {
    const tournaments = [makeTournament({ enable40kFactions: true })];
    const statusCounts = { all: 1, pending: 0, active: 1, completed: 0 };
    renderList({ tournaments, statusCounts, total: 1 });
    expect(screen.getByText(/40k beta/i)).toBeInTheDocument();
  });

  it("does not show the 40K Beta badge when enable40kFactions is false", () => {
    const tournaments = [makeTournament({ enable40kFactions: false })];
    const statusCounts = { all: 1, pending: 0, active: 1, completed: 0 };
    renderList({ tournaments, statusCounts, total: 1 });
    expect(screen.queryByText(/40k beta/i)).not.toBeInTheDocument();
  });

  it("renders tournament cards when tournaments are present", () => {
    const tournaments = [
      makeTournament({ _id: "t1", name: "Grand Cup" }),
      makeTournament({ _id: "t2", name: "Chaos Open" }),
    ];
    const statusCounts = { all: 2, pending: 0, active: 2, completed: 0 };
    renderList({ tournaments, statusCounts, total: 2 });
    expect(screen.getByText("Grand Cup")).toBeInTheDocument();
    expect(screen.getByText("Chaos Open")).toBeInTheDocument();
  });
});
