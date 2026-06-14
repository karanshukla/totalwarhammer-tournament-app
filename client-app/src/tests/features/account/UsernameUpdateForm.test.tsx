/**
 * Branch coverage for account/components/UsernameUpdateForm.tsx:
 * - user.username || "" → initial input value (empty when no username)
 * - validation: !username || username.length < 3 → shows error message
 * - isGuest=true → calls updateGuestUsername
 * - isGuest=false → calls updateAuthUsername
 * - catch: error instanceof Error → shows error.message
 * - catch: error NOT instanceof Error → shows "Failed to update username"
 * - handleUsernameChange: if (error) setError("") → clears error on re-type
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";

const {
  mockUpdateGuestUsername,
  mockUpdateAuthUsername,
  mockUseUserStore,
} = vi.hoisted(() => ({
  mockUpdateGuestUsername: vi.fn(),
  mockUpdateAuthUsername: vi.fn(),
  mockUseUserStore: vi.fn(),
}));

vi.mock("@/features/authentication/api/guestApi", () => ({
  updateGuestUsername: mockUpdateGuestUsername,
}));

vi.mock("@/features/account/api/accountApi", () => ({
  updateUsername: mockUpdateAuthUsername,
}));

vi.mock("@/shared/stores/userStore", () => ({
  useUserStore: (selector: (state: any) => any) => mockUseUserStore(selector),
}));

import UsernameUpdateForm from "@/features/account/components/UsernameUpdateForm";

function setupStore(username = "Grimgork") {
  mockUseUserStore.mockImplementation((selector: (state: any) => any) =>
    selector({ user: { username } }),
  );
}

function renderForm(username = "Grimgork", isGuest = false) {
  setupStore(username);
  return render(
    <ChakraProvider value={defaultSystem}>
      <UsernameUpdateForm isGuest={isGuest} />
    </ChakraProvider>,
  );
}

describe("UsernameUpdateForm – initial value (user.username || '')", () => {
  beforeEach(() => vi.clearAllMocks());

  it("initialises input with user.username when set", () => {
    renderForm("Grimgork");
    expect(screen.getByPlaceholderText(/new username/i)).toHaveValue("Grimgork");
  });

  it("initialises input as empty string when user.username is falsy", () => {
    renderForm("");
    expect(screen.getByPlaceholderText(/new username/i)).toHaveValue("");
  });
});

describe("UsernameUpdateForm – validation error (!username || length < 3)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows error when username is empty on submit", async () => {
    renderForm("");
    fireEvent.submit(screen.getByRole("button", { name: /update username/i }));
    await waitFor(() =>
      expect(
        screen.getByText(/usernames must be at least 3 characters/i),
      ).toBeInTheDocument(),
    );
    expect(mockUpdateAuthUsername).not.toHaveBeenCalled();
  });

  it("shows error when username is shorter than 3 chars", async () => {
    renderForm("");
    fireEvent.change(screen.getByPlaceholderText(/new username/i), {
      target: { value: "ab" },
    });
    fireEvent.submit(screen.getByRole("button", { name: /update username/i }));
    await waitFor(() =>
      expect(
        screen.getByText(/usernames must be at least 3 characters/i),
      ).toBeInTheDocument(),
    );
  });
});

describe("UsernameUpdateForm – clears error on re-type (if error setError(''))", () => {
  beforeEach(() => vi.clearAllMocks());

  it("clears validation error when user types again", async () => {
    renderForm("");
    fireEvent.submit(screen.getByRole("button", { name: /update username/i }));
    await waitFor(() =>
      expect(
        screen.getByText(/usernames must be at least 3 characters/i),
      ).toBeInTheDocument(),
    );
    fireEvent.change(screen.getByPlaceholderText(/new username/i), {
      target: { value: "NewName" },
    });
    expect(
      screen.queryByText(/usernames must be at least 3 characters/i),
    ).not.toBeInTheDocument();
  });
});

describe("UsernameUpdateForm – isGuest branch", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls updateGuestUsername when isGuest=true", async () => {
    mockUpdateGuestUsername.mockResolvedValueOnce({ success: true });
    renderForm("Grimgork", true);
    fireEvent.submit(screen.getByRole("button", { name: /update username/i }));
    await waitFor(() => expect(mockUpdateGuestUsername).toHaveBeenCalledWith("Grimgork"));
    expect(mockUpdateAuthUsername).not.toHaveBeenCalled();
  });

  it("calls updateUsername (auth) when isGuest=false", async () => {
    mockUpdateAuthUsername.mockResolvedValueOnce({ success: true });
    renderForm("Grimgork", false);
    fireEvent.submit(screen.getByRole("button", { name: /update username/i }));
    await waitFor(() => expect(mockUpdateAuthUsername).toHaveBeenCalledWith("Grimgork"));
    expect(mockUpdateGuestUsername).not.toHaveBeenCalled();
  });
});

describe("UsernameUpdateForm – catch Error instanceof branches", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows error.message when caught error is an Error instance", async () => {
    mockUpdateAuthUsername.mockRejectedValueOnce(new Error("Username taken"));
    renderForm("Grimgork", false);
    fireEvent.submit(screen.getByRole("button", { name: /update username/i }));
    await waitFor(() =>
      expect(screen.getByText("Username taken")).toBeInTheDocument(),
    );
  });

  it("shows generic message when caught error is not an Error instance", async () => {
    mockUpdateAuthUsername.mockRejectedValueOnce("some string error");
    renderForm("Grimgork", false);
    fireEvent.submit(screen.getByRole("button", { name: /update username/i }));
    await waitFor(() =>
      expect(
        screen.getByText(/failed to update username/i),
      ).toBeInTheDocument(),
    );
  });
});
