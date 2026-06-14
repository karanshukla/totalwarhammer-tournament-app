/**
 * Branch coverage for PasswordUpdateForm.tsx:
 * - Line 24: `!currentPassword || !newPassword || !confirmPassword` → "All fields required"
 * - Line 29: `newPassword !== confirmPassword` → "don't match"
 * - Line 34: `newPassword.length < 8` → "at least 8 characters"
 * - Line 18: `if (passwordError) setPasswordError("")` → clears on re-type
 * - Line 49: `if (error instanceof Error)` → uses error.message; else → generic
 * - Line 47: `window.location.reload()` on success (mocked)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";

vi.mock("@/features/account/api/accountApi", () => ({
  updatePassword: vi.fn(),
}));

// Mock PasswordInput as a plain input with the id and value/onChange passed through
vi.mock("@/shared/ui/PasswordInput", () => ({
  PasswordInput: ({
    id,
    value,
    onChange,
    placeholder,
  }: {
    id: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
  }) => (
    <input
      id={id}
      data-testid={id}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  ),
}));

import { updatePassword } from "@/features/account/api/accountApi";
import PasswordUpdateForm from "@/features/account/components/PasswordUpdateForm";

const mockUpdatePassword = vi.mocked(updatePassword);

function renderForm() {
  return render(
    <ChakraProvider value={defaultSystem}>
      <PasswordUpdateForm />
    </ChakraProvider>,
  );
}

function fillPasswords(current: string, newPwd: string, confirm: string) {
  fireEvent.change(screen.getByTestId("currentPassword"), {
    target: { id: "currentPassword", value: current },
  });
  fireEvent.change(screen.getByTestId("newPassword"), {
    target: { id: "newPassword", value: newPwd },
  });
  fireEvent.change(screen.getByTestId("confirmPassword"), {
    target: { id: "confirmPassword", value: confirm },
  });
}

describe("PasswordUpdateForm – validation branches", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows 'all fields required' when any password field is empty (line 24)", async () => {
    renderForm();
    // Leave all fields empty and submit
    fireEvent.submit(screen.getByRole("button", { name: /update password/i }).closest("form")!);

    await waitFor(() =>
      expect(screen.getByText(/all password fields are required/i)).toBeInTheDocument(),
    );
    expect(mockUpdatePassword).not.toHaveBeenCalled();
  });

  it("shows 'don't match' when new passwords differ (line 29)", async () => {
    renderForm();
    fillPasswords("oldpass1", "newpass1", "newpass2");
    fireEvent.submit(screen.getByRole("button", { name: /update password/i }).closest("form")!);

    await waitFor(() =>
      expect(screen.getByText(/don't match/i)).toBeInTheDocument(),
    );
  });

  it("shows 'at least 8 characters' when new password is too short (line 34)", async () => {
    renderForm();
    fillPasswords("oldpass1", "short", "short");
    fireEvent.submit(screen.getByRole("button", { name: /update password/i }).closest("form")!);

    await waitFor(() =>
      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument(),
    );
  });
});

describe("PasswordUpdateForm – error clearing on re-type (line 18)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("clears passwordError when user types after an error is shown", async () => {
    renderForm();
    // Trigger validation error (empty fields)
    fireEvent.submit(screen.getByRole("button", { name: /update password/i }).closest("form")!);
    await waitFor(() =>
      expect(screen.getByText(/all password fields are required/i)).toBeInTheDocument(),
    );

    // Now type in any field → error cleared
    fireEvent.change(screen.getByTestId("currentPassword"), {
      target: { id: "currentPassword", value: "x" },
    });
    expect(screen.queryByText(/all password fields are required/i)).not.toBeInTheDocument();
  });
});

describe("PasswordUpdateForm – catch error type branch (line 49)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.location.reload to prevent jsdom error
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, reload: vi.fn() },
    });
  });

  it("shows error.message for Error instance in catch (line 49 true)", async () => {
    mockUpdatePassword.mockRejectedValueOnce(new Error("Wrong current password"));
    renderForm();
    fillPasswords("wrong-old", "newpassword1", "newpassword1");
    fireEvent.submit(screen.getByRole("button", { name: /update password/i }).closest("form")!);

    await waitFor(() =>
      expect(screen.getByText("Wrong current password")).toBeInTheDocument(),
    );
  });

  it("shows generic message for non-Error in catch (line 49 false)", async () => {
    mockUpdatePassword.mockRejectedValueOnce("plain error");
    renderForm();
    fillPasswords("old-pass", "newpassword1", "newpassword1");
    fireEvent.submit(screen.getByRole("button", { name: /update password/i }).closest("form")!);

    await waitFor(() =>
      expect(screen.getByText("Failed to update password")).toBeInTheDocument(),
    );
  });

  it("calls window.location.reload on successful update (line 47)", async () => {
    mockUpdatePassword.mockResolvedValueOnce({ success: true, message: "ok" });
    renderForm();
    fillPasswords("old-pass", "newpassword1", "newpassword1");
    fireEvent.submit(screen.getByRole("button", { name: /update password/i }).closest("form")!);

    await waitFor(() =>
      expect(window.location.reload).toHaveBeenCalled(),
    );
  });
});
