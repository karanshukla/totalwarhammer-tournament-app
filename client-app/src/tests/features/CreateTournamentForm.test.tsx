import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { BrowserRouter } from "react-router-dom";

vi.mock("@/shared/ui/Toaster", () => ({
  toaster: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

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

import { toaster } from "@/shared/ui/Toaster";
import { httpClient } from "@/core/api/httpClient";
import CreateTournamentForm from "@/features/tournaments/components/CreateTournamentForm";

const mockPost = vi.mocked(httpClient.post);
const mockToaster = vi.mocked(toaster);

function renderForm() {
  return render(
    <BrowserRouter>
      <ChakraProvider value={defaultSystem}>
        <CreateTournamentForm />
      </ChakraProvider>
    </BrowserRouter>,
  );
}

describe("CreateTournamentForm", () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockToaster.success.mockReset();
    mockToaster.error.mockReset();
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
    mockPost.mockResolvedValueOnce({
      success: true,
      data: { _id: "t1", name: "Test Tournament" },
    });

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

  it("shows success message via toaster after successful submission", async () => {
    mockPost.mockResolvedValueOnce({
      success: true,
      data: { _id: "t1", name: "Test Tournament" },
    });

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
      expect(mockToaster.success).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Tournament Created",
          description: expect.stringContaining("successfully"),
        }),
      );
    });
  });

  it("resets the form after successful submission", async () => {
    mockPost.mockResolvedValueOnce({
      success: true,
      data: { _id: "t1", name: "Test Tournament" },
    });

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

  it("shows error message via toaster on failed submission", async () => {
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
      expect(mockToaster.error).toHaveBeenCalledWith(
        expect.objectContaining({
          description: "Unauthorized: Not authenticated",
        }),
      );
    });
  });

  it("shows fallback error message via toaster when error is not an Error instance", async () => {
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
      expect(mockToaster.error).toHaveBeenCalledWith(
        expect.objectContaining({
          description: "An error occurred",
        }),
      );
    });
  });

  it("does not show toaster initially", () => {
    renderForm();
    expect(mockToaster.success).not.toHaveBeenCalled();
    expect(mockToaster.error).not.toHaveBeenCalled();
  });

  it("calls toaster for each attempt when form is resubmitted", async () => {
    mockPost.mockRejectedValueOnce(new Error("Network error"));
    mockPost.mockResolvedValueOnce({
      success: true,
      data: { _id: "t2", name: "Retry" },
    });

    renderForm();

    const nameInput = screen.getByPlaceholderText("Enter tournament name");
    const form = screen
      .getByRole("button", { name: /create tournament/i })
      .closest("form")!;

    await userEvent.type(nameInput, "Retry");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockToaster.error).toHaveBeenCalledWith(
        expect.objectContaining({ description: "Network error" }),
      );
    });

    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockToaster.success).toHaveBeenCalled();
    });
  });
});
