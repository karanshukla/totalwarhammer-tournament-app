/**
 * Branch coverage for DeleteAccountSection.tsx:
 * - Line 22: `if (!confirming)` → true: shows Delete button only
 * - confirming=true: shows confirmation UI (after clicking Delete Account)
 * - handleDelete success: navigate("/") called
 * - handleDelete catch: setIsLoading(false), no navigate
 * - Cancel button: sets confirming=false
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { MemoryRouter } from "react-router";

const mockNavigate = vi.fn();

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("../api/accountApi", () => ({
  deleteAccount: vi.fn(),
}));

vi.mock("@/features/account/api/accountApi", () => ({
  deleteAccount: vi.fn(),
}));

import { deleteAccount } from "@/features/account/api/accountApi";
import DeleteAccountSection from "@/features/account/components/DeleteAccountSection";

const mockDeleteAccount = vi.mocked(deleteAccount);

function renderSection() {
  return render(
    <MemoryRouter>
      <ChakraProvider value={defaultSystem}>
        <DeleteAccountSection />
      </ChakraProvider>
    </MemoryRouter>,
  );
}

describe("DeleteAccountSection – confirming=false (line 22 true branch)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows only Delete Account button initially", () => {
    renderSection();
    expect(
      screen.getByRole("button", { name: /delete account/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/are you sure/i)).not.toBeInTheDocument();
  });

  it("shows confirmation UI after clicking Delete Account", async () => {
    renderSection();
    await userEvent.click(
      screen.getByRole("button", { name: /delete account/i }),
    );
    expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /yes, delete my account/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });
});

describe("DeleteAccountSection – cancel (restores !confirming)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("hides confirmation UI when Cancel is clicked", async () => {
    renderSection();
    await userEvent.click(
      screen.getByRole("button", { name: /delete account/i }),
    );
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByText(/are you sure/i)).not.toBeInTheDocument();
  });
});

describe("DeleteAccountSection – handleDelete success path", () => {
  beforeEach(() => vi.clearAllMocks());

  it("navigates to / after successful deletion", async () => {
    mockDeleteAccount.mockResolvedValueOnce({
      success: true,
      message: "deleted",
    });
    renderSection();
    await userEvent.click(
      screen.getByRole("button", { name: /delete account/i }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: /yes, delete my account/i }),
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });
});

describe("DeleteAccountSection – handleDelete error path (catch branch)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("stays on page and does not navigate when deleteAccount throws", async () => {
    mockDeleteAccount.mockRejectedValueOnce(new Error("Server error"));
    renderSection();
    await userEvent.click(
      screen.getByRole("button", { name: /delete account/i }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: /yes, delete my account/i }),
    );

    await waitFor(() => {
      // After catch, loading is reset but the component stays — no navigate
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
