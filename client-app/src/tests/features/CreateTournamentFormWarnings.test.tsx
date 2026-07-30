/**
 * Extended coverage for CreateTournamentForm — warning/info message branches.
 * Covers lines 371, 377, 386, 394:
 *  - 371: Single Elimination n < 2 ("Need at least 2 players.")
 *  - 377: Double Elimination not power-of-2 (info about byes)
 *  - 386: Swiss System odd player count (warning about byes)
 *  - 394: Round Robin n > 16 (warning about total matches)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { BrowserRouter } from "react-router";

vi.mock("@/shared/ui/Toaster", () => ({
  toaster: { create: vi.fn(), success: vi.fn(), error: vi.fn() },
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
    onValueChange: (v: { value: string; valueAsNumber: number }) => void;
  }) => (
    <div
      data-testid="number-input-root"
      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
        onValueChange({
          value: e.target.value,
          valueAsNumber: Number(e.target.value),
        })
      }
    >
      {children}
    </div>
  ),
  NumberInputField: () => (
    <input data-testid="number-input-field" type="number" />
  ),
}));

import CreateTournamentForm from "@/features/tournaments/components/CreateTournamentForm";

function renderForm() {
  return render(
    <BrowserRouter>
      <ChakraProvider value={defaultSystem}>
        <CreateTournamentForm />
      </ChakraProvider>
    </BrowserRouter>,
  );
}

function setPlayerCount(value: string) {
  const input = screen.getByTestId("number-input-field");
  fireEvent.change(input, { target: { value } });
}

async function setTournamentType(type: string) {
  await userEvent.click(screen.getByRole("combobox"));
  await userEvent.click(await screen.findByRole("option", { name: type }));
}

describe("CreateTournamentForm – warning messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows 'Need at least 2 players' for Single Elimination with 1 player", async () => {
    renderForm();
    await setTournamentType("Single Elimination");
    setPlayerCount("1");
    await waitFor(() => {
      expect(screen.getByText(/need at least 2 players/i)).toBeInTheDocument();
    });
  });

  it("shows info about byes for Double Elimination with non-power-of-2 players", async () => {
    renderForm();
    await setTournamentType("Double Elimination");
    setPlayerCount("3");
    await waitFor(() => {
      expect(
        screen.getByText(/some round 1 matches will have byes/i),
      ).toBeInTheDocument();
    });
  });

  it("shows warning for Swiss System with odd player count", async () => {
    renderForm();
    await setTournamentType("Swiss System");
    setPlayerCount("3");
    await waitFor(() => {
      expect(screen.getByText(/odd number of players/i)).toBeInTheDocument();
    });
  });

  it("shows warning for Round Robin with > 16 players", async () => {
    renderForm();
    await setTournamentType("Round Robin");
    setPlayerCount("17");
    await waitFor(() => {
      expect(screen.getByText(/consider swiss instead/i)).toBeInTheDocument();
    });
  });

  it("shows Swiss info message (rounds count) for even player count", async () => {
    renderForm();
    await setTournamentType("Swiss System");
    setPlayerCount("4");
    await waitFor(() => {
      expect(screen.getByText(/will run/i)).toBeInTheDocument();
    });
  });

  it("shows Round Robin info (rounds and matches) for valid player count", async () => {
    renderForm();
    await setTournamentType("Round Robin");
    setPlayerCount("4");
    await waitFor(() => {
      expect(screen.getByText(/round.*match.*\/round/i)).toBeInTheDocument();
    });
  });

  it("shows Double Elimination warning for < 4 players", async () => {
    renderForm();
    await setTournamentType("Double Elimination");
    setPlayerCount("2");
    await waitFor(() => {
      expect(
        screen.getByText(/double elimination requires at least 4 players/i),
      ).toBeInTheDocument();
    });
  });

  it("shows Round Robin warning for < 3 players", async () => {
    renderForm();
    await setTournamentType("Round Robin");
    setPlayerCount("2");
    await waitFor(() => {
      expect(
        screen.getByText(/round robin works best with 3 or more players/i),
      ).toBeInTheDocument();
    });
  });
});
