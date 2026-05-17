import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { BrowserRouter } from "react-router-dom";

vi.mock("@/shared/ui/Toaster", () => ({
  toaster: {
    create: vi.fn(),
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
    mockToaster.create.mockReset();
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
      expect(mockToaster.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Tournament Created",
          type: "success",
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
      expect(mockToaster.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "error",
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
      expect(mockToaster.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "error",
          description: "An error occurred",
        }),
      );
    });
  });

  it("does not show toaster initially", () => {
    renderForm();
    expect(mockToaster.create).not.toHaveBeenCalled();
  });

  describe("40K faction toggle", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("shows WH3 factions by default", () => {
      renderForm();
      expect(screen.getByText("Empire")).toBeInTheDocument();
      expect(screen.getByText("Skaven")).toBeInTheDocument();
      expect(screen.queryByText("Adeptus Astartes")).not.toBeInTheDocument();
    });

    it("shows 40K factions after clicking the 40K button", async () => {
      renderForm();
      fireEvent.click(screen.getByRole("button", { name: "40K" }));
      await waitFor(() =>
        expect(screen.getByText("Adeptus Astartes")).toBeInTheDocument(),
      );
      expect(screen.queryByText("Empire")).not.toBeInTheDocument();
    });

    it("switches back to WH3 factions after clicking WH3 button", async () => {
      renderForm();
      fireEvent.click(screen.getByRole("button", { name: "40K" }));
      await waitFor(() =>
        expect(screen.getByText("Adeptus Astartes")).toBeInTheDocument(),
      );
      fireEvent.click(screen.getByRole("button", { name: "WH3" }));
      await waitFor(() =>
        expect(screen.getByText("Empire")).toBeInTheDocument(),
      );
      expect(screen.queryByText("Adeptus Astartes")).not.toBeInTheDocument();
    });

    it("does not switch when clicking the already-active mode button", async () => {
      renderForm();
      fireEvent.click(screen.getByRole("button", { name: "WH3" }));
      // Give any potential timer a chance to fire
      await new Promise((r) => setTimeout(r, 300));
      expect(screen.getByText("Empire")).toBeInTheDocument();
      expect(screen.queryByText("Adeptus Astartes")).not.toBeInTheDocument();
    });

    it("submits with enable40kFactions: true when in 40K mode", async () => {
      mockPost.mockResolvedValueOnce({
        success: true,
        data: { _id: "t1", name: "40K Cup" },
      });

      renderForm();
      fireEvent.click(screen.getByRole("button", { name: "40K" }));
      await waitFor(() =>
        expect(screen.getByText("Adeptus Astartes")).toBeInTheDocument(),
      );

      await userEvent.type(
        screen.getByPlaceholderText("Enter tournament name"),
        "40K Cup",
      );
      fireEvent.submit(
        screen
          .getByRole("button", { name: /create tournament/i })
          .closest("form")!,
      );

      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith(
          "/tournament",
          expect.objectContaining({ enable40kFactions: true }),
        );
      });
    });

    it("submits with enable40kFactions: false by default", async () => {
      mockPost.mockResolvedValueOnce({
        success: true,
        data: { _id: "t1", name: "WH3 Cup" },
      });

      renderForm();
      await userEvent.type(
        screen.getByPlaceholderText("Enter tournament name"),
        "WH3 Cup",
      );
      fireEvent.submit(
        screen
          .getByRole("button", { name: /create tournament/i })
          .closest("form")!,
      );

      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith(
          "/tournament",
          expect.objectContaining({ enable40kFactions: false }),
        );
      });
    });
  });

  describe("banned faction shift-select", () => {
    const getFactionCheckbox = (name: string) => {
      const label = screen.getByText(name).closest("label");
      return (label ??
        screen.getByText(name).closest("[data-scope]"))!.querySelector(
        "input",
      ) as HTMLInputElement;
    };

    it("shift-click with no prior anchor acts as a plain click", () => {
      renderForm();

      fireEvent.click(screen.getByText("Empire"), { shiftKey: true });

      expect(getFactionCheckbox("Empire")).toBeChecked();
      expect(getFactionCheckbox("Dwarfs")).not.toBeChecked();
    });

    it("shift-click deselects the range when the clicked faction is already selected", () => {
      renderForm();

      // Select [0..2]
      fireEvent.click(screen.getByText("Empire"));
      fireEvent.click(screen.getByText("Greenskins"), { shiftKey: true });

      // Reset anchor to Empire, then deselect range via shift-click on Greenskins
      fireEvent.click(screen.getByText("Empire"));
      fireEvent.click(screen.getByText("Greenskins"), { shiftKey: true });

      expect(getFactionCheckbox("Empire")).not.toBeChecked();
      expect(getFactionCheckbox("Dwarfs")).not.toBeChecked();
      expect(getFactionCheckbox("Greenskins")).not.toBeChecked();
    });
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
      expect(mockToaster.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "error",
          description: "Network error",
        }),
      );
    });

    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockToaster.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: "success" }),
      );
    });
  });
});
