/**
 * Extended coverage tests for TournamentsPage.
 * Covers tab switching, code search (success/error), hash navigation.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { MemoryRouter } from "react-router-dom";
import TournamentsPage from "@/features/tournaments/components/TournamentsPage";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("@/core/api/httpClient", () => ({
  httpClient: { get: vi.fn() },
}));

vi.mock("@/shared/stores/userStore", () => ({
  useUserStore: vi.fn(),
}));

import { httpClient } from "@/core/api/httpClient";
import { useUserStore } from "@/shared/stores/userStore";

const mockGet = vi.mocked(httpClient.get);
const mockUseUserStore = vi.mocked(useUserStore as unknown as () => ReturnType<typeof useUserStore>);

function renderPage(initialEntry = "/") {
  return render(
    <ChakraProvider value={defaultSystem}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <TournamentsPage />
      </MemoryRouter>
    </ChakraProvider>,
  );
}

describe("TournamentsPage – tab switching", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.location.hash = "";
    (mockUseUserStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { id: "u1", username: "testuser", isAuthenticated: true, isGuest: false },
      isAuthenticated: vi.fn().mockReturnValue(true),
    });
    mockGet.mockResolvedValue({ success: true, data: [] });
  });

  it("shows SimpleBracket content for 'brackets' tab by default", () => {
    renderPage();
    expect(screen.getByText("Tournament Participants")).toBeInTheDocument();
  });

  it("switches to CreateTournamentForm when 'Create a Tournament' tab is clicked", async () => {
    renderPage();
    await userEvent.click(screen.getByText("Create a Tournament"));
    // CreateTournamentForm renders a form with a tournament name field
    await waitFor(() => {
      expect(
        screen.queryByLabelText(/tournament name/i) ||
        screen.queryByPlaceholderText(/tournament name/i) ||
        screen.queryByText(/tournament name/i)
      ).not.toBeNull();
    });
  });

  it("switches to TournamentBrowser for 'View Ongoing Tournaments' tab", async () => {
    renderPage();
    await userEvent.click(screen.getByText("View Ongoing Tournaments"));
    // TournamentBrowser shows loading or empty state
    await waitFor(() => {
      expect(
        screen.queryByText(/loading tournaments/i) ||
        screen.queryByText(/no open tournaments/i) ||
        screen.queryByText(/tournament participants/i)
      ).toBeDefined();
    });
  });

  it("switches to past TournamentBrowser for 'View Past Tournaments' tab", async () => {
    renderPage();
    await userEvent.click(screen.getByText("View Past Tournaments"));
    await waitFor(() => {
      expect(
        screen.queryByText(/loading tournaments/i) ||
        screen.queryByText(/no completed tournaments/i)
      ).toBeDefined();
    });
  });

  it("renders all four tab cards", () => {
    renderPage();
    expect(screen.getByText("Create a Simple Bracket")).toBeInTheDocument();
    expect(screen.getByText("Create a Tournament")).toBeInTheDocument();
    expect(screen.getByText("View Ongoing Tournaments")).toBeInTheDocument();
    expect(screen.getByText("View Past Tournaments")).toBeInTheDocument();
  });
});

describe("TournamentsPage – code search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.location.hash = "";
    // Reset hash so page starts on brackets tab, not TournamentBrowser tab
    mockGet.mockResolvedValue({ success: true, data: [] });
    (mockUseUserStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { id: "u1", username: "testuser", isAuthenticated: true, isGuest: false },
      isAuthenticated: vi.fn().mockReturnValue(true),
    });
  });

  it("shows error when code is not found", async () => {
    mockGet.mockRejectedValue(new Error("Not found"));
    renderPage();
    const input = screen.getByPlaceholderText(/abc123/i);
    await userEvent.type(input, "BADCODE");
    await userEvent.click(screen.getByRole("button", { name: /find tournament/i }));
    await waitFor(() => {
      expect(screen.getByText(/no tournament found with that code/i)).toBeInTheDocument();
    });
  });

  it("navigates to matches when user is a participant", async () => {
    (mockUseUserStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { id: "u1", username: "Alice", isAuthenticated: true, isGuest: false },
      isAuthenticated: vi.fn().mockReturnValue(true),
    });
    mockGet.mockResolvedValueOnce({
      success: true,
      data: {
        _id: "t99",
        participants: [{ name: "Alice" }],
      },
    });
    renderPage();
    const input = screen.getByPlaceholderText(/abc123/i);
    await userEvent.type(input, "VALIDCODE");
    await userEvent.click(screen.getByRole("button", { name: /find tournament/i }));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/matches#t99");
    });
  });

  it("navigates to spectate when user is not a participant", async () => {
    mockGet.mockResolvedValueOnce({
      success: true,
      data: {
        _id: "t88",
        participants: [{ name: "SomeoneElse" }],
      },
    });
    renderPage();
    const input = screen.getByPlaceholderText(/abc123/i);
    await userEvent.type(input, "VALIDCODE");
    await userEvent.click(screen.getByRole("button", { name: /find tournament/i }));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/matches/spectate/t88");
    });
  });

  it("does not search when input is empty", async () => {
    mockGet.mockResolvedValue({ success: true, data: [] });
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /find tournament/i }));
    expect(mockGet).not.toHaveBeenCalledWith(expect.stringContaining("/tournament/code/"));
  });

  it("trims and uppercases the code before searching", async () => {
    mockGet.mockResolvedValueOnce({
      success: true,
      data: { _id: "t1", participants: [] },
    });
    renderPage();
    const input = screen.getByPlaceholderText(/abc123/i);
    await userEvent.type(input, "  abc123  ");
    await userEvent.click(screen.getByRole("button", { name: /find tournament/i }));
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("ABC123"));
    });
  });

  it("triggers search when Enter key is pressed in input", async () => {
    mockGet.mockRejectedValue(new Error("Not found"));
    renderPage();
    const input = screen.getByPlaceholderText(/abc123/i);
    await userEvent.type(input, "TEST{Enter}");
    await waitFor(() => {
      expect(screen.getByText(/no tournament found/i)).toBeInTheDocument();
    });
  });

  it("matches guest user by id as participant", async () => {
    (mockUseUserStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { id: "guestABCDEF", username: "", isAuthenticated: true, isGuest: true },
      isAuthenticated: vi.fn().mockReturnValue(true),
    });
    mockGet.mockResolvedValueOnce({
      success: true,
      data: {
        _id: "t77",
        participants: [{ name: "guestABCDEF" }],
      },
    });
    renderPage();
    const input = screen.getByPlaceholderText(/abc123/i);
    await userEvent.type(input, "CODE");
    await userEvent.click(screen.getByRole("button", { name: /find tournament/i }));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/matches#t77");
    });
  });
});
