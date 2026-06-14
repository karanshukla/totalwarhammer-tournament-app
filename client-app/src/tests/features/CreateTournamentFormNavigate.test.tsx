/**
 * Branch coverage for CreateTournamentForm.tsx line 148:
 *   `onClick: () => navigate(\`/matches/tournament/${response.data.code}\`)`
 *
 * The toast action's onClick callback is never directly tested in existing tests
 * (toaster is mocked, so the action is captured but never invoked).
 * This test extracts the callback from toaster.create's captured arguments
 * and calls it to verify navigate is called with the correct path.
 */
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

import { toaster } from "@/shared/ui/Toaster";
import { httpClient } from "@/core/api/httpClient";
import CreateTournamentForm from "@/features/tournaments/components/CreateTournamentForm";

const mockPost = vi.mocked(httpClient.post);
const mockToasterCreate = vi.mocked(toaster.create);

function renderForm() {
  return render(
    <MemoryRouter>
      <ChakraProvider value={defaultSystem}>
        <CreateTournamentForm />
      </ChakraProvider>
    </MemoryRouter>,
  );
}

describe("CreateTournamentForm – toast action navigate (line 148)", () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockToasterCreate.mockReset();
    mockNavigate.mockReset();
  });

  it("toast action onClick navigates to tournament matches page (line 148)", async () => {
    mockPost.mockResolvedValueOnce({
      success: true,
      data: { _id: "t1", name: "Battle Cup", code: "BTC123" },
    });

    renderForm();

    await fireEvent.submit(
      screen.getByRole("button", { name: /create tournament/i }).closest("form")!,
    );

    await waitFor(() => {
      expect(mockToasterCreate).toHaveBeenCalled();
    });

    // Extract the action onClick from the captured toaster.create call
    const createCall = mockToasterCreate.mock.calls[0][0] as {
      action?: { onClick?: () => void };
    };

    expect(createCall.action).toBeDefined();
    expect(createCall.action?.onClick).toBeInstanceOf(Function);

    // Invoke the callback — this is the branch at line 148
    createCall.action!.onClick!();

    expect(mockNavigate).toHaveBeenCalledWith("/matches/tournament/BTC123");
  });

  it("toast action navigate uses the code from the response", async () => {
    mockPost.mockResolvedValueOnce({
      success: true,
      data: { _id: "t2", name: "Other Cup", code: "OTH999" },
    });

    renderForm();

    await fireEvent.submit(
      screen.getByRole("button", { name: /create tournament/i }).closest("form")!,
    );

    await waitFor(() => {
      expect(mockToasterCreate).toHaveBeenCalled();
    });

    const createCall = mockToasterCreate.mock.calls[0][0] as {
      action?: { onClick?: () => void };
    };
    createCall.action!.onClick!();

    expect(mockNavigate).toHaveBeenCalledWith("/matches/tournament/OTH999");
  });
});
