/**
 * Branch coverage for authentication/components/AuthenticationForm.tsx:
 * - view="check" (initial): shows username/email field + "Continue as Guest" button
 * - onSubmit, userExists=true → view="login" → LoginForm rendered
 * - onSubmit, userExists=false → view="register" → RegistrationForm rendered
 * - Reset Password button → view="reset-password" → PasswordResetForm rendered
 * - handleGuestLogin: createGuestUser resolves → dispatches close-drawer event
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { MemoryRouter } from "react-router";

const { mockUserExists, mockCreateGuestUser } = vi.hoisted(() => ({
  mockUserExists: vi.fn(),
  mockCreateGuestUser: vi.fn(),
}));

vi.mock("@/features/authentication/api/registrationApi", () => ({
  userExists: mockUserExists,
}));

vi.mock("@/features/authentication/api/guestApi", () => ({
  createGuestUser: mockCreateGuestUser,
}));

vi.mock("@/shared/ui/Toaster", () => ({
  Toaster: () => null,
  toaster: { create: vi.fn() },
}));

vi.mock("@/features/authentication/components/LoginForm", () => ({
  LoginForm: () => <div data-testid="login-form" />,
}));

vi.mock("@/features/authentication/components/RegistrationForm", () => ({
  RegistrationForm: ({ defaultIdentifier }: { defaultIdentifier?: string }) => (
    <div data-testid="registration-form" data-default-identifier={defaultIdentifier ?? ""} />
  ),
}));

vi.mock("@/features/authentication/components/PasswordResetForm", () => ({
  PasswordResetForm: ({ onBackClick }: { onBackClick: () => void; onSuccess: () => void }) => (
    <div data-testid="password-reset-form">
      <button onClick={onBackClick}>Back</button>
    </div>
  ),
}));

import { AuthenticationForm } from "@/features/authentication/components/AuthenticationForm";

function renderForm() {
  return render(
    <MemoryRouter>
      <ChakraProvider value={defaultSystem}>
        <AuthenticationForm />
      </ChakraProvider>
    </MemoryRouter>,
  );
}

describe("AuthenticationForm – initial view='check'", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders username/email field and Continue as Guest button", () => {
    renderForm();
    expect(screen.getByRole("textbox", { name: /username or email/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue as guest/i })).toBeInTheDocument();
  });
});

describe("AuthenticationForm – userExists=true → view='login'", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows LoginForm when user exists", async () => {
    mockUserExists.mockResolvedValueOnce(true);
    renderForm();
    fireEvent.change(screen.getByRole("textbox", { name: /username or email/i }), {
      target: { value: "existing_user" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: /submit/i }).closest("form")!,
    );
    await waitFor(() => expect(screen.getByTestId("login-form")).toBeInTheDocument());
  });
});

describe("AuthenticationForm – userExists=false → view='register'", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows RegistrationForm when user does not exist", async () => {
    mockUserExists.mockResolvedValueOnce(false);
    renderForm();
    fireEvent.change(screen.getByRole("textbox", { name: /username or email/i }), {
      target: { value: "new_user_here" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: /submit/i }).closest("form")!,
    );
    await waitFor(() => expect(screen.getByTestId("registration-form")).toBeInTheDocument());
  });

  it("carries the typed value into RegistrationForm as defaultIdentifier", async () => {
    mockUserExists.mockResolvedValueOnce(false);
    renderForm();
    fireEvent.change(screen.getByRole("textbox", { name: /username or email/i }), {
      target: { value: "someone@example.com" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: /submit/i }).closest("form")!,
    );
    await waitFor(() =>
      expect(screen.getByTestId("registration-form")).toHaveAttribute(
        "data-default-identifier",
        "someone@example.com",
      ),
    );
  });
});

describe("AuthenticationForm – Reset Password → view='reset-password'", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows PasswordResetForm when Reset Password is clicked", async () => {
    renderForm();
    await userEvent.click(screen.getByRole("button", { name: /reset password/i }));
    expect(screen.getByTestId("password-reset-form")).toBeInTheDocument();
  });

  it("goes back to check view when Back is clicked in PasswordResetForm", async () => {
    renderForm();
    await userEvent.click(screen.getByRole("button", { name: /reset password/i }));
    await userEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(screen.getByRole("textbox", { name: /username or email/i })).toBeInTheDocument();
  });
});

describe("AuthenticationForm – handleGuestLogin", () => {
  beforeEach(() => vi.clearAllMocks());

  it("dispatches close-drawer event after guest account created", async () => {
    mockCreateGuestUser.mockResolvedValueOnce({ success: true });
    const handler = vi.fn();
    document.addEventListener("auth-event", handler);
    renderForm();
    await userEvent.click(screen.getByRole("button", { name: /continue as guest/i }));
    await waitFor(() => expect(handler).toHaveBeenCalled());
    const evt = handler.mock.calls[0][0] as CustomEvent;
    expect(evt.detail?.type).toBe("close-drawer");
    document.removeEventListener("auth-event", handler);
  });
});
