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
  gameFilter: "all" as "all" | "wh3" | "40k",
  onSelectTournament: vi.fn(),
  onFindByCode: vi.fn(),
  onCodeInputChange: vi.fn(),
  onStatusFilterChange: vi.fn(),
  onGameFilterChange: vi.fn(),
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
  it("hides status filter buttons when there are no tournaments at all", () => {
    renderList({ tournaments: [], statusCounts: emptyStatusCounts });
    // The status "All" button carries a numeric count badge ("All<n>"); when
    // there are no tournaments it isn't rendered. The game-system "All Games"
    // button (no count) is independent and stays rendered.
    expect(
      screen.queryByRole("button", { name: /^All\d/i }),
    ).not.toBeInTheDocument();
  });

  it("shows filter buttons when tournaments exist", () => {
    const tournaments = [makeTournament()];
    const statusCounts = { all: 1, pending: 0, active: 1, completed: 0 };
    renderList({ tournaments, statusCounts });
    // Status buttons are the count-bearing "All<n>" / "Active<n>" ones.
    expect(
      screen.getByRole("button", { name: /^All\d/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /active/i }),
    ).toBeInTheDocument();
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
      screen.getByRole("button", { name: /^Pending\d/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^Completed\d/i }),
    ).toBeInTheDocument();
    // The status "All" filter button (count-bearing) should be present; the
    // empty-state "Show all" button is separate, and the game "All Games"
    // button (no count) is a third "all" control.
    expect(
      screen.getByRole("button", { name: /^All\d/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /show all/i }),
    ).toBeInTheDocument();
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

  it("shows the 40K badge when enable40kFactions is true", () => {
    const tournaments = [makeTournament({ enable40kFactions: true })];
    const statusCounts = { all: 1, pending: 0, active: 1, completed: 0 };
    renderList({ tournaments, statusCounts, total: 1 });
    // The 40K tournament badge renders as a <span> (Chakra Badge); the
    // game-system "40K" filter button (a <button>) is always present, so
    // disambiguate by tag name.
    const fortyKMatches = screen.getAllByText("40K");
    expect(
      fortyKMatches.some((el) => el.tagName.toLowerCase() === "span"),
    ).toBe(true);
  });

  it("does not show the 40K badge when enable40kFactions is false", () => {
    const tournaments = [makeTournament({ enable40kFactions: false })];
    const statusCounts = { all: 1, pending: 0, active: 1, completed: 0 };
    renderList({ tournaments, statusCounts, total: 1 });
    // No badge <span>; the only "40K" element is the filter button.
    const fortyKMatches = screen.getAllByText("40K");
    expect(
      fortyKMatches.every((el) => el.tagName.toLowerCase() !== "span"),
    ).toBe(true);
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
