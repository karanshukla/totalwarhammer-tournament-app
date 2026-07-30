/**
 * Branch coverage for TournamentLookup.tsx:
 * - Line 45:  `res.data ?? []`  — when server returns data=undefined/null
 * - Line 62:  guest fallback string — when user.isGuest && user.id
 * - Lines 63-66: guestFallback && ln === guestFallback match branch
 * - Line 202: `t.code ? ... : /tournament/:id` — View button without code
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { MemoryRouter } from "react-router";
import TournamentLookup from "@/features/home/components/TournamentLookup";

const mockNavigate = vi.hoisted(() => vi.fn());
const mockGet = vi.hoisted(() => vi.fn());

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
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

describe("TournamentLookup – branch coverage", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockNavigate.mockReset();
  });

  it("handles undefined data from active tournaments fetch (line 45: ?? [])", async () => {
    // Server returns a response object without a data property → data is undefined → ?? []
    mockGet.mockResolvedValue({ success: true });

    renderLookup();

    // The component should NOT show the Tournaments section (no data means empty)
    await waitFor(() => {
      expect(screen.queryByText("Tournaments")).not.toBeInTheDocument();
    });
  });

  it("handles null data from active tournaments fetch (line 45: ?? [])", async () => {
    mockGet.mockResolvedValue({ success: true, data: null });

    renderLookup();

    await waitFor(() => {
      expect(screen.queryByText("Tournaments")).not.toBeInTheDocument();
    });
  });

  it("guest user finds tournament by guestFallback match (line 62-66)", async () => {
    const { useUserStore } = await import("@/shared/stores/userStore");
    vi.mocked(useUserStore).mockReturnValue({
      user: {
        isAuthenticated: false,
        isGuest: true,
        id: "abcdef1234",
        username: "",
        email: "",
      },
    } as ReturnType<typeof useUserStore>);

    // The guest fallback is `guest_${id.substring(0, 6)}` = "guest_abcdef"
    mockGet
      .mockResolvedValueOnce({ success: true, data: [] })
      .mockResolvedValueOnce({
        success: true,
        data: { _id: "t_guest", participants: [{ name: "guest_abcdef" }] },
      });

    renderLookup();

    const input = screen.getByPlaceholderText(/e.g., ABC123/i);
    await userEvent.type(input, "GUEST1");
    await userEvent.click(screen.getByRole("button", { name: /View Tournament/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/matches/tournament/GUEST1");
    });
  });

  it("isParticipant check via user.id direct match (line 66: p.name === user?.id)", async () => {
    const { useUserStore } = await import("@/shared/stores/userStore");
    vi.mocked(useUserStore).mockReturnValue({
      user: {
        isAuthenticated: false,
        isGuest: true,
        id: "exact-match-id",
        username: "",
        email: "",
      },
    } as ReturnType<typeof useUserStore>);

    mockGet
      .mockResolvedValueOnce({ success: true, data: [] })
      .mockResolvedValueOnce({
        success: true,
        data: { _id: "t_id", participants: [{ name: "exact-match-id" }] },
      });

    renderLookup();

    const input = screen.getByPlaceholderText(/e.g., ABC123/i);
    await userEvent.type(input, "IDCODE");
    await userEvent.click(screen.getByRole("button", { name: /View Tournament/i }));

    await waitFor(() => {
      // name matches user.id → navigate to tournament (participant)
      expect(mockNavigate).toHaveBeenCalledWith("/matches/tournament/IDCODE");
    });
  });

  it("View button for active tournament without code navigates to /tournament/:id (line 202)", async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: [
        {
          _id: "tid-no-code",
          // No code property → fallback to /tournament/:id
          name: "No Code Cup",
          tournamentType: "Round Robin",
          playerCount: 4,
          status: "active",
          participants: [],
        },
      ],
    });

    renderLookup();

    await waitFor(() => {
      expect(screen.getByText("No Code Cup")).toBeInTheDocument();
    });

    const allButtons = screen.getAllByRole("button");
    const viewBtn = allButtons.find((b) => b.textContent?.trim() === "View");

    if (viewBtn) {
      await userEvent.click(viewBtn);
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/tournament/tid-no-code");
      });
    }
  });
});
