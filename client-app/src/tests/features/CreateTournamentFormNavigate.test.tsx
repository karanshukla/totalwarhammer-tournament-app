import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { MemoryRouter } from "react-router-dom";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("@/shared/ui/Toaster", () => ({
  toaster: { create: vi.fn() },
}));

vi.mock("@/core/api/httpClient", () => ({
  httpClient: { post: vi.fn() },
}));

vi.mock("@/shared/ui/NumberInput", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  NumberInputRoot: ({ children, onValueChange }: any) => (
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

import { httpClient } from "@/core/api/httpClient";
import CreateTournamentForm from "@/features/tournaments/components/CreateTournamentForm";

const mockPost = vi.mocked(httpClient.post);

function renderForm() {
  return render(
    <MemoryRouter>
      <ChakraProvider value={defaultSystem}>
        <CreateTournamentForm />
      </ChakraProvider>
    </MemoryRouter>,
  );
}

describe("CreateTournamentForm – navigate on creation", () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockNavigate.mockReset();
  });

  it("navigates to the tournament matches page after successful creation", async () => {
    mockPost.mockResolvedValueOnce({
      success: true,
      data: { _id: "t1", name: "Battle Cup", code: "BTC123" },
    });

    renderForm();

    fireEvent.submit(
      screen.getByRole("button", { name: /create tournament/i }).closest("form")!,
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/matches/tournament/BTC123");
    });
  });

  it("uses the code from the response when navigating", async () => {
    mockPost.mockResolvedValueOnce({
      success: true,
      data: { _id: "t2", name: "Other Cup", code: "OTH999" },
    });

    renderForm();

    fireEvent.submit(
      screen.getByRole("button", { name: /create tournament/i }).closest("form")!,
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/matches/tournament/OTH999");
    });
  });

  it("does not navigate when creation fails", async () => {
    mockPost.mockRejectedValueOnce(new Error("Server error"));

    renderForm();

    fireEvent.submit(
      screen.getByRole("button", { name: /create tournament/i }).closest("form")!,
    );

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalled();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
