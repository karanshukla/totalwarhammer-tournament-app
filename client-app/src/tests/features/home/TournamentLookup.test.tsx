import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { MemoryRouter } from "react-router-dom";
import TournamentLookup from "@/features/home/components/TournamentLookup";

const mockNavigate = vi.hoisted(() => vi.fn());
const mockGet = vi.hoisted(() => vi.fn());

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("@/core/api/httpClient", () => ({
  httpClient: { get: mockGet },
}));

vi.mock("@/shared/stores/userStore", () => ({
  useUserStore: vi.fn(() => ({
    user: {
      isAuthenticated: false,
      isGuest: false,
      id: "",
      username: "",
      email: "",
    },
  })),
}));

function renderLookup() {
  return render(
    <ChakraProvider value={defaultSystem}>
      <MemoryRouter>
        <TournamentLookup />
      </MemoryRouter>
    </ChakraProvider>,
  );
}

describe("TournamentLookup", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockNavigate.mockReset();
    mockGet.mockResolvedValue({ success: true, data: [] });
  });

  it("renders the code input and submit button", () => {
    renderLookup();
    expect(screen.getByPlaceholderText(/e.g., ABC123/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /View Tournament/i }),
    ).toBeInTheDocument();
  });

  it("renders the card title and description", () => {
    renderLookup();
    expect(screen.getByText(/View a Tournament/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /Enter a tournament code or select an ongoing tournament/i,
      ),
    ).toBeInTheDocument();
  });

  it("shows an error when the code is not found", async () => {
    mockGet
      .mockResolvedValueOnce({ success: true, data: [] }) // initial active tournaments fetch
      .mockRejectedValueOnce(new Error("Not found"));

    renderLookup();

    await userEvent.type(
      screen.getByPlaceholderText(/e.g., ABC123/i),
      "BADCODE",
    );
    await userEvent.click(
      screen.getByRole("button", { name: /View Tournament/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByText(/No tournament found with that code/i),
      ).toBeInTheDocument();
    });
  });

  it("navigates to /t/:code when user is not a participant", async () => {
    mockGet
      .mockResolvedValueOnce({ success: true, data: [] })
      .mockResolvedValueOnce({
        success: true,
        data: { _id: "t123", participants: [{ name: "other_player" }] },
      });

    renderLookup();

    await userEvent.type(
      screen.getByPlaceholderText(/e.g., ABC123/i),
      "ABC123",
    );
    await userEvent.click(
      screen.getByRole("button", { name: /View Tournament/i }),
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/matches/spectate/ABC123");
    });
  });

  it("navigates to matches when user is a participant", async () => {
    const { useUserStore } = await import("@/shared/stores/userStore");
    vi.mocked(useUserStore).mockReturnValue({
      user: {
        isAuthenticated: true,
        isGuest: false,
        id: "u1",
        username: "TestPlayer",
        email: "",
      },
    } as ReturnType<typeof useUserStore>);

    mockGet
      .mockResolvedValueOnce({ success: true, data: [] })
      .mockResolvedValueOnce({
        success: true,
        data: { _id: "t456", participants: [{ name: "testplayer" }] },
      });

    renderLookup();

    await userEvent.type(
      screen.getByPlaceholderText(/e.g., ABC123/i),
      "XYZ789",
    );
    await userEvent.click(
      screen.getByRole("button", { name: /View Tournament/i }),
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/matches/XYZ789");
    });
  });

  it("submits on Enter key press", async () => {
    mockGet
      .mockResolvedValueOnce({ success: true, data: [] })
      .mockRejectedValueOnce(new Error("Not found"));

    renderLookup();

    const input = screen.getByPlaceholderText(/e.g., ABC123/i);
    await userEvent.type(input, "ENTER1{Enter}");

    await waitFor(() => {
      expect(
        screen.getByText(/No tournament found with that code/i),
      ).toBeInTheDocument();
    });
  });

  it("does not submit when code input is empty", async () => {
    mockGet.mockResolvedValueOnce({ success: true, data: [] });

    renderLookup();

    await userEvent.click(
      screen.getByRole("button", { name: /View Tournament/i }),
    );

    // Only the initial active tournaments fetch should have been called
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("shows active tournaments list when data is returned", async () => {
    mockGet.mockResolvedValueOnce({
      success: true,
      data: [
        {
          _id: "t1",
          name: "Grand Cup",
          tournamentType: "Single Elimination",
          playerCount: 8,
          status: "active",
          participants: [{ _id: "p1", name: "Alice", faction: "Empire" }],
        },
        {
          _id: "t2",
          name: "Winter Brawl",
          tournamentType: "Round Robin",
          playerCount: 4,
          status: "pending",
          participants: [],
        },
      ],
    });

    renderLookup();

    await waitFor(() => {
      expect(screen.getByText("Grand Cup")).toBeInTheDocument();
      expect(screen.getByText("Winter Brawl")).toBeInTheDocument();
    });

    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("shows View all tournaments link when more than 6 tournaments exist", async () => {
    const tournaments = Array.from({ length: 7 }, (_, i) => ({
      _id: `t${i}`,
      name: `Tournament ${i}`,
      tournamentType: "Round Robin",
      playerCount: 4,
      status: "active" as const,
      participants: [],
    }));

    mockGet.mockResolvedValueOnce({ success: true, data: tournaments });

    renderLookup();

    await waitFor(() => {
      expect(
        screen.getByRole("link", { name: /View all tournaments/i }),
      ).toBeInTheDocument();
    });
  });

  it("does not show active tournaments section when list is empty", async () => {
    mockGet.mockResolvedValueOnce({ success: true, data: [] });

    renderLookup();

    await waitFor(() => {
      expect(screen.queryByText("Tournaments")).not.toBeInTheDocument();
    });
  });
});
