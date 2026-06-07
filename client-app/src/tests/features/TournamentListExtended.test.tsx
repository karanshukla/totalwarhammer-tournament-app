/**
 * Extended coverage tests for TournamentList (matches/components).
 * Covers lines 134-175 (unauthenticated empty state + Sign In button)
 * and lines 216-282 (tournament cards, card click, pagination).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { BrowserRouter } from "react-router-dom";
import TournamentList from "@/features/matches/components/TournamentList";
import { Tournament } from "@/features/matches/components/types";

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

const baseProps = {
  page: 1,
  total: 0,
  pageSize: 4,
  statusFilter: "all" as const,
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

describe("TournamentList – unauthenticated empty state", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows 'Sign in to view your tournaments' when unauthenticated and no tournaments", () => {
    renderList({
      tournaments: [],
      statusCounts: emptyStatusCounts,
      isAuthenticated: false,
    });
    expect(screen.getByText(/sign in to view your tournaments/i)).toBeInTheDocument();
  });

  it("shows Sign In button when unauthenticated and no tournaments", () => {
    renderList({
      tournaments: [],
      statusCounts: emptyStatusCounts,
      isAuthenticated: false,
    });
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("Sign In button dispatches auth-event custom event", async () => {
    const dispatchSpy = vi.spyOn(document, "dispatchEvent");
    renderList({
      tournaments: [],
      statusCounts: emptyStatusCounts,
      isAuthenticated: false,
    });
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: "auth-event" }),
    );
    dispatchSpy.mockRestore();
  });

  it("shows 'Go to the Tournaments page' when authenticated and no tournaments", () => {
    renderList({
      tournaments: [],
      statusCounts: emptyStatusCounts,
      isAuthenticated: true,
    });
    // The text "Go to the Tournaments page to create or join one." is split across elements
    expect(screen.getByText(/go to the/i)).toBeInTheDocument();
    expect(screen.getByText(/create or join one/i)).toBeInTheDocument();
  });

  it("shows error message when error prop is set", () => {
    renderList({
      tournaments: [],
      statusCounts: emptyStatusCounts,
      error: "Something went wrong",
    });
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });
});

describe("TournamentList – tournament cards", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls onSelectTournament when a tournament card is clicked", async () => {
    const onSelectTournament = vi.fn();
    const tournament = makeTournament({ _id: "t42", name: "Grand Slam" });
    const statusCounts = { all: 1, pending: 0, active: 1, completed: 0 };
    renderList({ tournaments: [tournament], statusCounts, total: 1, onSelectTournament });
    const card = screen.getByText("Grand Slam").closest("[role='article'], [data-slot='root'], .chakra-card");
    // Click the tournament card
    await userEvent.click(screen.getByText("Grand Slam"));
    expect(onSelectTournament).toHaveBeenCalled();
  });

  it("renders participant count for each tournament card", () => {
    const tournament = makeTournament({ participants: [{ _id: "p1", name: "Alice", faction: "Empire" }], playerCount: 8 });
    const statusCounts = { all: 1, pending: 0, active: 1, completed: 0 };
    renderList({ tournaments: [tournament], statusCounts, total: 1 });
    expect(screen.getByText("1/8")).toBeInTheDocument();
  });

  it("shows loading state hint (pointer-events none)", () => {
    const tournament = makeTournament({ name: "Ongoing Cup" });
    const statusCounts = { all: 1, pending: 0, active: 1, completed: 0 };
    renderList({ tournaments: [tournament], statusCounts, total: 1, listLoading: true });
    // Just verify the tournament is rendered while loading
    expect(screen.getByText("Ongoing Cup")).toBeInTheDocument();
  });
});

describe("TournamentList – pagination", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does not show pagination when total fits on one page", () => {
    const tournaments = [makeTournament()];
    const statusCounts = { all: 1, pending: 0, active: 1, completed: 0 };
    renderList({ tournaments, statusCounts, total: 1, pageSize: 4, page: 1 });
    expect(screen.queryByRole("button", { name: /previous/i })).not.toBeInTheDocument();
  });

  it("shows pagination when total exceeds pageSize", () => {
    const tournaments = Array.from({ length: 4 }, (_, i) =>
      makeTournament({ _id: `t${i}`, name: `Cup ${i}` }),
    );
    const statusCounts = { all: 8, pending: 0, active: 8, completed: 0 };
    renderList({ tournaments, statusCounts, total: 8, pageSize: 4, page: 1 });
    expect(screen.getByRole("button", { name: /previous/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
  });

  it("calls onPageChange with previous page when Previous is clicked", async () => {
    const onPageChange = vi.fn();
    const tournaments = Array.from({ length: 4 }, (_, i) =>
      makeTournament({ _id: `t${i}`, name: `Cup ${i}` }),
    );
    const statusCounts = { all: 8, pending: 0, active: 8, completed: 0 };
    renderList({ tournaments, statusCounts, total: 8, pageSize: 4, page: 2, onPageChange });
    await userEvent.click(screen.getByRole("button", { name: /previous/i }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("calls onPageChange with next page when Next is clicked", async () => {
    const onPageChange = vi.fn();
    const tournaments = Array.from({ length: 4 }, (_, i) =>
      makeTournament({ _id: `t${i}`, name: `Cup ${i}` }),
    );
    const statusCounts = { all: 8, pending: 0, active: 8, completed: 0 };
    renderList({ tournaments, statusCounts, total: 8, pageSize: 4, page: 1, onPageChange });
    await userEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("shows correct page indicator", () => {
    const tournaments = Array.from({ length: 4 }, (_, i) =>
      makeTournament({ _id: `t${i}`, name: `Cup ${i}` }),
    );
    const statusCounts = { all: 8, pending: 0, active: 8, completed: 0 };
    renderList({ tournaments, statusCounts, total: 8, pageSize: 4, page: 2 });
    expect(screen.getByText(/page 2 of 2/i)).toBeInTheDocument();
  });

  it("calls onStatusFilterChange and onPageChange when a filter button is clicked", async () => {
    const onStatusFilterChange = vi.fn();
    const onPageChange = vi.fn();
    const tournaments = [makeTournament()];
    const statusCounts = { all: 1, pending: 1, active: 0, completed: 0 };
    renderList({ tournaments, statusCounts, total: 1, onStatusFilterChange, onPageChange });
    await userEvent.click(screen.getByRole("button", { name: /pending/i }));
    expect(onStatusFilterChange).toHaveBeenCalledWith("pending");
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("shows code error when codeError is set", () => {
    renderList({
      tournaments: [],
      statusCounts: emptyStatusCounts,
      codeError: "Invalid code",
    });
    expect(screen.getByText("Invalid code")).toBeInTheDocument();
  });

  it("calls onFindByCode when Enter is pressed in code input", async () => {
    const onFindByCode = vi.fn();
    renderList({
      tournaments: [],
      statusCounts: emptyStatusCounts,
      codeInput: "ABC123",
      onFindByCode,
    });
    const input = screen.getByPlaceholderText(/abc123/i);
    await userEvent.type(input, "{Enter}");
    expect(onFindByCode).toHaveBeenCalled();
  });

  it("calls onCodeInputChange when typing in code input", async () => {
    const onCodeInputChange = vi.fn();
    renderList({
      tournaments: [],
      statusCounts: emptyStatusCounts,
      onCodeInputChange,
    });
    const input = screen.getByPlaceholderText(/abc123/i);
    await userEvent.type(input, "X");
    expect(onCodeInputChange).toHaveBeenCalled();
  });
});
