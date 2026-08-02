import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { BrowserRouter } from "react-router";

vi.mock("@/shared/ui/Toaster", () => ({
  toaster: { create: vi.fn() },
}));

vi.mock("@/core/api/httpClient", () => ({
  httpClient: { post: vi.fn() },
}));

vi.mock("@/shared/ui/NumberInput", () => ({
  NumberInputRoot: ({
    children,
    onValueChange,
  }: {
    children: React.ReactNode;
    onValueChange: (v: { value: string }) => void;
  }) => (
    <div
      data-testid="number-input-root"
      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
        onValueChange({ value: e.target.value })
      }
    >
      {children}
    </div>
  ),
  NumberInputField: () => <input data-testid="number-input-field" />,
}));

import CreateTournamentForm from "@/features/tournaments/components/CreateTournamentForm";

function renderForm(isGuest = false) {
  return render(
    <BrowserRouter>
      <ChakraProvider value={defaultSystem}>
        <CreateTournamentForm isGuest={isGuest} />
      </ChakraProvider>
    </BrowserRouter>,
  );
}

describe("CreateTournamentForm - extended coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("tournament type warnings and info messages", () => {
    const selectTournamentType = async (type: string) => {
      await userEvent.click(screen.getByRole("combobox"));
      await userEvent.click(await screen.findByRole("option", { name: type }));
    };

    const setPlayerCount = (count: number) => {
      const input = screen.getByTestId("number-input-field");
      fireEvent.change(input, { target: { value: String(count) } });
    };

    describe("Swiss System", () => {
      it("shows rounds info message for Swiss System", async () => {
        renderForm();
        await selectTournamentType("Swiss System");
        // Default 8 players: ceil(log2(8)) = 3 rounds
        expect(screen.getByText(/will run 3 rounds/i)).toBeInTheDocument();
      });

      it("shows bye warning for odd player count with Swiss System", async () => {
        renderForm();
        await selectTournamentType("Swiss System");
        setPlayerCount(7);
        expect(screen.getByText(/odd number of players/i)).toBeInTheDocument();
      });

      it("shows correct rounds for Swiss System with 2 players", async () => {
        renderForm();
        await selectTournamentType("Swiss System");
        setPlayerCount(2);
        expect(screen.getByText(/will run 1 round/i)).toBeInTheDocument();
      });

      it("shows info box for Swiss System algorithm", async () => {
        renderForm();
        await selectTournamentType("Swiss System");
        expect(screen.getByText(/blossom algorithm/i)).toBeInTheDocument();
      });
    });

    describe("Round Robin", () => {
      it("shows rounds and matches info for Round Robin with even players", async () => {
        renderForm();
        await selectTournamentType("Round Robin");
        // Default 8 players: 7 rounds, 4 matches/round
        expect(
          screen.getByText(/7 rounds, 4 matches\/round/i),
        ).toBeInTheDocument();
      });

      it("shows bye info for Round Robin with odd players", async () => {
        renderForm();
        await selectTournamentType("Round Robin");
        setPlayerCount(5);
        // 5 players: 5 rounds, 2 matches/round, 1 bye per round
        expect(screen.getByText(/1 bye per round/i)).toBeInTheDocument();
      });

      it("shows warning for Round Robin with many players (>16)", async () => {
        renderForm();
        await selectTournamentType("Round Robin");
        setPlayerCount(20);
        // 20 players: 19 rounds, 10 matches/round = 190 total - triggers warning
        expect(screen.getByText(/consider swiss instead/i)).toBeInTheDocument();
      });

      it("shows warning when Round Robin has fewer than 3 players", async () => {
        renderForm();
        await selectTournamentType("Round Robin");
        setPlayerCount(2);
        expect(
          screen.getByText(/works best with 3 or more players/i),
        ).toBeInTheDocument();
      });
    });

    describe("Single Elimination", () => {
      it("shows bye warning when player count is not a power of 2", async () => {
        renderForm();
        await selectTournamentType("Single Elimination");
        setPlayerCount(5);
        expect(
          screen.getByText(/5 players is not a power of 2/i),
        ).toBeInTheDocument();
      });

      it("shows no warnings when player count is a power of 2", async () => {
        renderForm();
        await selectTournamentType("Single Elimination");
        setPlayerCount(8);
        expect(screen.queryByText(/not a power of 2/i)).not.toBeInTheDocument();
      });

      it("shows warning when fewer than 2 players", async () => {
        renderForm();
        await selectTournamentType("Single Elimination");
        setPlayerCount(1);
        expect(
          screen.getByText(/need at least 2 players/i),
        ).toBeInTheDocument();
      });
    });

    describe("Double Elimination", () => {
      it("shows warning when fewer than 4 players", async () => {
        renderForm();
        await selectTournamentType("Double Elimination");
        setPlayerCount(3);
        expect(
          screen.getByText(/requires at least 4 players/i),
        ).toBeInTheDocument();
      });

      it("shows info when player count is not a power of 2", async () => {
        renderForm();
        await selectTournamentType("Double Elimination");
        setPlayerCount(5);
        expect(screen.getByText(/not a power of 2/i)).toBeInTheDocument();
      });

      it("shows no warnings for 8 players Double Elimination", async () => {
        renderForm();
        await selectTournamentType("Double Elimination");
        setPlayerCount(8);
        expect(screen.queryByText(/not a power of 2/i)).not.toBeInTheDocument();
        expect(
          screen.queryByText(/requires at least/i),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("40K faction mode", () => {
    it("shows 40K factions when 40K mode is enabled", async () => {
      renderForm();
      // WH3 is the default — Empire is visible, Adeptus Astartes is not.
      expect(screen.getByText("Empire")).toBeInTheDocument();
      expect(screen.queryByText("Adeptus Astartes")).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "40K" }));
      await waitFor(() => {
        expect(screen.getByText("Adeptus Astartes")).toBeInTheDocument();
      });
      expect(screen.queryByText("Empire")).not.toBeInTheDocument();
    });

    it("switches back to WH3 factions when toggled back", async () => {
      renderForm();
      fireEvent.click(screen.getByRole("button", { name: "40K" }));
      await waitFor(() =>
        expect(screen.getByText("Necrons")).toBeInTheDocument(),
      );
      fireEvent.click(screen.getByRole("button", { name: "WH3" }));
      await waitFor(() => {
        expect(screen.getByText("Empire")).toBeInTheDocument();
      });
      expect(screen.queryByText("Necrons")).not.toBeInTheDocument();
    });
  });

  describe("guest mode", () => {
    it("shows registration required message for guests", () => {
      renderForm(true);
      expect(screen.getByText(/registration required/i)).toBeInTheDocument();
    });

    it("disables submit button for guests", () => {
      renderForm(true);
      expect(
        screen.getByRole("button", { name: /create tournament/i }),
      ).toBeDisabled();
    });

    it("does not show registration required for non-guests", () => {
      renderForm(false);
      expect(
        screen.queryByText(/registration required/i),
      ).not.toBeInTheDocument();
    });
  });

  describe("description character limit", () => {
    it("shows character count", async () => {
      renderForm();
      const desc = screen.getByPlaceholderText(/markdown supported/i);
      fireEvent.change(desc, { target: { value: "hello" } });
      expect(screen.getByText("5/2000")).toBeInTheDocument();
    });

    it("shows character count at 0 initially", () => {
      renderForm();
      expect(screen.getByText("0/2000")).toBeInTheDocument();
    });
  });

  describe("keyboard event listeners for shift key", () => {
    it("sets up keydown/keyup listeners for shift on mount", () => {
      const addEventSpy = vi.spyOn(document, "addEventListener");
      renderForm();
      expect(addEventSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
      expect(addEventSpy).toHaveBeenCalledWith("keyup", expect.any(Function));
      addEventSpy.mockRestore();
    });

    it("removes keydown/keyup listeners on unmount", () => {
      const removeEventSpy = vi.spyOn(document, "removeEventListener");
      const { unmount } = renderForm();
      unmount();
      expect(removeEventSpy).toHaveBeenCalledWith(
        "keydown",
        expect.any(Function),
      );
      expect(removeEventSpy).toHaveBeenCalledWith(
        "keyup",
        expect.any(Function),
      );
      removeEventSpy.mockRestore();
    });
  });
});
