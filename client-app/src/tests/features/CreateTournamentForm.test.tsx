import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";

vi.mock("@/core/api/httpClient", () => ({
  httpClient: {
    post: vi.fn(),
  },
}));

vi.mock("@/shared/ui/NumberInput", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  NumberInputRoot: ({ children, onValueChange }: any) => (
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
  NumberInputField: () => <input data-testid="number-input-field" />,
}));

import { httpClient } from "@/core/api/httpClient";
import CreateTournamentForm from "@/features/tournaments/components/CreateTournamentForm";

const mockPost = vi.mocked(httpClient.post);

function renderForm() {
  return render(
    <ChakraProvider value={defaultSystem}>
      <CreateTournamentForm />
    </ChakraProvider>,
  );
}

describe("CreateTournamentForm", () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  it("renders the form fields", () => {
    renderForm();
    expect(
      screen.getByPlaceholderText("Enter tournament name"),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(
        "Enter tournament description (Markdown supported)",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create tournament/i }),
    ).toBeInTheDocument();
  });

  it("renders all tournament type options", () => {
    renderForm();
    const select = screen.getByRole("combobox");
    const options = Array.from(select.querySelectorAll("option")).map(
      (o) => o.textContent,
    );
    expect(options).toContain("Single Elimination");
    expect(options).toContain("Double Elimination");
    expect(options).toContain("Round Robin");
    expect(options).toContain("Swiss System");
  });

  it("renders faction checkboxes", () => {
    renderForm();
    expect(screen.getByText("Skaven")).toBeInTheDocument();
    expect(screen.getByText("Empire")).toBeInTheDocument();
    expect(screen.getByText("Nurgle")).toBeInTheDocument();
  });

  it("updates the name field on input", async () => {
    renderForm();
    const nameInput = screen.getByPlaceholderText("Enter tournament name");
    await userEvent.type(nameInput, "Grand Cup");
    expect(nameInput).toHaveValue("Grand Cup");
  });

  it("updates the description field on input", async () => {
    renderForm();
    const descInput = screen.getByPlaceholderText(
      "Enter tournament description (Markdown supported)",
    );
    await userEvent.type(descInput, "A great tournament");
    expect(descInput).toHaveValue("A great tournament");
  });

  it("updates the tournament type on selection", async () => {
    renderForm();
    const select = screen.getByRole("combobox");
    await userEvent.selectOptions(select, "Round Robin");
    expect(select).toHaveValue("Round Robin");
  });

  it("calls httpClient.post with form data on submit", async () => {
    mockPost.mockResolvedValueOnce({ success: true, data: {} });

    renderForm();

    await userEvent.type(
      screen.getByPlaceholderText("Enter tournament name"),
      "Test Tournament",
    );
    fireEvent.submit(
      screen
        .getByRole("button", { name: /create tournament/i })
        .closest("form")!,
    );

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledOnce();
      expect(mockPost).toHaveBeenCalledWith(
        "/tournament",
        expect.objectContaining({ name: "Test Tournament" }),
      );
    });
  });

  it("shows success message after successful submission", async () => {
    mockPost.mockResolvedValueOnce({ success: true, data: {} });

    renderForm();

    await userEvent.type(
      screen.getByPlaceholderText("Enter tournament name"),
      "Test Tournament",
    );
    fireEvent.submit(
      screen
        .getByRole("button", { name: /create tournament/i })
        .closest("form")!,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Tournament created successfully!"),
      ).toBeInTheDocument();
    });
  });

  it("resets the form after successful submission", async () => {
    mockPost.mockResolvedValueOnce({ success: true, data: {} });

    renderForm();

    const nameInput = screen.getByPlaceholderText("Enter tournament name");
    await userEvent.type(nameInput, "Test Tournament");
    fireEvent.submit(
      screen
        .getByRole("button", { name: /create tournament/i })
        .closest("form")!,
    );

    await waitFor(() => {
      expect(nameInput).toHaveValue("");
    });
  });

  it("shows error message on failed submission", async () => {
    mockPost.mockRejectedValueOnce(
      new Error("Unauthorized: Not authenticated"),
    );

    renderForm();

    await userEvent.type(
      screen.getByPlaceholderText("Enter tournament name"),
      "Test Tournament",
    );
    fireEvent.submit(
      screen
        .getByRole("button", { name: /create tournament/i })
        .closest("form")!,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Unauthorized: Not authenticated"),
      ).toBeInTheDocument();
    });
  });

  it("shows fallback error message when error is not an Error instance", async () => {
    mockPost.mockRejectedValueOnce("something went wrong");

    renderForm();

    await userEvent.type(
      screen.getByPlaceholderText("Enter tournament name"),
      "Test Tournament",
    );
    fireEvent.submit(
      screen
        .getByRole("button", { name: /create tournament/i })
        .closest("form")!,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Failed to create tournament"),
      ).toBeInTheDocument();
    });
  });

  it("does not show error or success initially", () => {
    renderForm();
    expect(
      screen.queryByText("Tournament created successfully!"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Failed to create tournament/i),
    ).not.toBeInTheDocument();
  });

  it("clears error when form is resubmitted", async () => {
    mockPost.mockRejectedValueOnce(new Error("Network error"));
    mockPost.mockResolvedValueOnce({ success: true, data: {} });

    renderForm();

    const nameInput = screen.getByPlaceholderText("Enter tournament name");
    const form = screen
      .getByRole("button", { name: /create tournament/i })
      .closest("form")!;

    await userEvent.type(nameInput, "Test Tournament");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });

    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.queryByText("Network error")).not.toBeInTheDocument();
    });
  });
});
