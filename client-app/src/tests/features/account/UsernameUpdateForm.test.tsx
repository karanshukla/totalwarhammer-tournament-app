/**
 * Branch coverage for UsernameUpdateForm.tsx:
 * - Line 21: `if (error) setError("")` — clears error on re-type when error exists
 * - Line 27: `!username || username.length < 3` — validation failure
 * - Line 33: `if (isGuest)` — true (guest) → updateGuestUsername; false → updateAuthUsername
 * - Line 40: `if (error instanceof Error)` — true: uses error.message; false: generic message
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";

vi.mock("@/features/authentication/api/guestApi", () => ({
  updateGuestUsername: vi.fn(),
}));

vi.mock("@/features/account/api/accountApi", () => ({
  updateUsername: vi.fn(),
}));

vi.mock("@/shared/stores/userStore", () => ({
  useUserStore: vi.fn((selector: (state: { user: { username: string } }) => unknown) =>
    selector({ user: { username: "TestUser" } }),
  ),
}));

import { updateGuestUsername } from "@/features/authentication/api/guestApi";
import { updateUsername } from "@/features/account/api/accountApi";
import UsernameUpdateForm from "@/features/account/components/UsernameUpdateForm";

const mockUpdateGuestUsername = vi.mocked(updateGuestUsername);
const mockUpdateUsername = vi.mocked(updateUsername);

function renderForm(isGuest = false) {
  return render(
    <ChakraProvider value={defaultSystem}>
      <UsernameUpdateForm isGuest={isGuest} />
    </ChakraProvider>,
  );
}

describe("UsernameUpdateForm – validation branch (line 27)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows validation error when username is empty", async () => {
    renderForm();
    const input = screen.getByPlaceholderText(/enter your new username/i);
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.submit(input.closest("form")!);

    await waitFor(() =>
      expect(
        screen.getByText(/at least 3 characters/i),
      ).toBeInTheDocument(),
    );
    expect(mockUpdateGuestUsername).not.toHaveBeenCalled();
  });

  it("shows validation error when username is fewer than 3 chars", async () => {
    renderForm();
    const input = screen.getByPlaceholderText(/enter your new username/i);
    fireEvent.change(input, { target: { value: "ab" } });
    fireEvent.submit(input.closest("form")!);

    await waitFor(() =>
      expect(
        screen.getByText(/at least 3 characters/i),
      ).toBeInTheDocument(),
    );
  });
});

describe("UsernameUpdateForm – error clearing on change (line 21)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("clears error when user types after an error is shown", async () => {
    renderForm();
    const input = screen.getByPlaceholderText(/enter your new username/i);

    // Trigger validation error
    fireEvent.change(input, { target: { value: "a" } });
    fireEvent.submit(input.closest("form")!);
    await waitFor(() =>
      expect(screen.getByText(/at least 3 characters/i)).toBeInTheDocument(),
    );

    // Now type more text → error should be cleared
    fireEvent.change(input, { target: { value: "ab" } });
    // The error clearing happens synchronously via setError("") in handleUsernameChange
    expect(screen.queryByText(/at least 3 characters/i)).not.toBeInTheDocument();
  });
});

describe("UsernameUpdateForm – isGuest branch (line 33)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls updateGuestUsername when isGuest=true", async () => {
    mockUpdateGuestUsername.mockResolvedValueOnce({
      success: true,
      message: "ok",
      data: { id: "g1", username: "GuestUser", email: "", isGuest: true, expiresAt: Date.now() + 1000 },
    });

    renderForm(true);
    const input = screen.getByPlaceholderText(/enter your new username/i);
    fireEvent.change(input, { target: { value: "GuestUser" } });
    fireEvent.submit(input.closest("form")!);

    await waitFor(() =>
      expect(mockUpdateGuestUsername).toHaveBeenCalledWith("GuestUser"),
    );
    expect(mockUpdateUsername).not.toHaveBeenCalled();
  });

  it("calls updateUsername (auth) when isGuest=false", async () => {
    mockUpdateUsername.mockResolvedValueOnce({
      success: true,
      message: "ok",
      data: { id: "u1", username: "AuthUser", email: "a@b.com" },
    });

    renderForm(false);
    const input = screen.getByPlaceholderText(/enter your new username/i);
    fireEvent.change(input, { target: { value: "AuthUser" } });
    fireEvent.submit(input.closest("form")!);

    await waitFor(() =>
      expect(mockUpdateUsername).toHaveBeenCalledWith("AuthUser"),
    );
    expect(mockUpdateGuestUsername).not.toHaveBeenCalled();
  });
});

describe("UsernameUpdateForm – error type branch in catch (line 40)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows error.message when catch receives an Error instance (line 40 true)", async () => {
    mockUpdateUsername.mockRejectedValueOnce(new Error("Name already taken"));

    renderForm(false);
    const input = screen.getByPlaceholderText(/enter your new username/i);
    fireEvent.change(input, { target: { value: "TakenName" } });
    fireEvent.submit(input.closest("form")!);

    await waitFor(() =>
      expect(screen.getByText("Name already taken")).toBeInTheDocument(),
    );
  });

  it("shows generic message when catch receives non-Error (line 40 false)", async () => {
    mockUpdateUsername.mockRejectedValueOnce("plain string error");

    renderForm(false);
    const input = screen.getByPlaceholderText(/enter your new username/i);
    fireEvent.change(input, { target: { value: "SomeName" } });
    fireEvent.submit(input.closest("form")!);

    await waitFor(() =>
      expect(
        screen.getByText("Failed to update username"),
      ).toBeInTheDocument(),
    );
  });
});
