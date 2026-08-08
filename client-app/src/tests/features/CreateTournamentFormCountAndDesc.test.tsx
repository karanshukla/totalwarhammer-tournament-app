/**
 * Branch coverage for CreateTournamentForm.tsx:
 * - Line 121: `parseInt(value) || 2` — false branch when parseInt returns NaN (empty/non-numeric)
 *   → playerCount falls back to 2
 * - Line 248: `formData.description.length >= 2000` — true branch
 *   → character counter text is rendered (color computed at line 248)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { MemoryRouter } from "react-router";

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock("@/shared/ui/Toaster", () => ({
  toaster: { create: vi.fn() },
}));

vi.mock("@/core/api/httpClient", () => ({
  httpClient: { post: vi.fn() },
}));

// Mock NumberInputRoot as a controlled input so fireEvent.change invokes onValueChange directly
vi.mock("@/shared/ui/NumberInput", () => ({
  NumberInputRoot: ({
    onValueChange,
    value,
  }: {
    children?: React.ReactNode;
    onValueChange: (v: { value: string }) => void;
    value?: string;
  }) => (
    <input
      data-testid="number-input-field"
      value={value ?? ""}
      onChange={(e) => onValueChange({ value: e.target.value })}
    />
  ),
  NumberInputField: () => null,
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

describe("CreateTournamentForm – handleNumberChange NaN fallback (line 121)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPost.mockResolvedValue({
      success: true,
      data: { _id: "t1", name: "Test", code: "TST123" },
    });
  });

  it("playerCount falls back to 2 when value is empty string (parseInt returns NaN)", async () => {
    renderForm();

    // Set name (required field)
    fireEvent.change(screen.getByPlaceholderText(/enter tournament name/i), {
      target: { value: "Test Cup", name: "name" },
    });

    // Trigger handleNumberChange with "" → parseInt("") = NaN → NaN || 2 = 2
    fireEvent.change(screen.getByTestId("number-input-field"), {
      target: { value: "" },
    });

    // Submit and verify playerCount was set to 2 (the fallback)
    const form = screen
      .getByRole("button", { name: /create tournament/i })
      .closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalled();
    });

    const [, body] = mockPost.mock.calls[0] as [
      string,
      { playerCount: number },
    ];
    expect(body.playerCount).toBe(2);
  });

  it("playerCount falls back to 2 when value is non-numeric (parseInt returns NaN)", async () => {
    renderForm();

    fireEvent.change(screen.getByPlaceholderText(/enter tournament name/i), {
      target: { value: "Cup", name: "name" },
    });

    // "abc" → parseInt("abc") = NaN → NaN || 2 = 2
    fireEvent.change(screen.getByTestId("number-input-field"), {
      target: { value: "abc" },
    });

    const form = screen
      .getByRole("button", { name: /create tournament/i })
      .closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalled();
    });

    const [, body] = mockPost.mock.calls[0] as [
      string,
      { playerCount: number },
    ];
    expect(body.playerCount).toBe(2);
  });
});

describe("CreateTournamentForm – description >= 2000 color branch (line 248)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("counter shows 2000/2000 when description is at max length (line 248 true branch)", async () => {
    renderForm();

    const textarea = screen.getByPlaceholderText(
      /enter tournament description/i,
    );
    fireEvent.change(textarea, { target: { value: "A".repeat(2000) } });

    await waitFor(() => {
      expect(screen.getByText("2000/2000")).toBeInTheDocument();
    });
  });

  it("counter shows n/2000 when description is under max length (line 248 false branch)", async () => {
    renderForm();

    const textarea = screen.getByPlaceholderText(
      /enter tournament description/i,
    );
    fireEvent.change(textarea, { target: { value: "short" } });

    await waitFor(() => {
      expect(screen.getByText("5/2000")).toBeInTheDocument();
    });
  });
});
