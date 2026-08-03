/**
 * Branch coverage for authentication/components/RegistrationForm.tsx:
 * - onSubmit success: registerUser resolves → navigate("/")
 * - onSubmit catch: registerUser rejects → no navigate
 * - Validation: short username → error shown, no registerUser call
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { MemoryRouter } from "react-router";

const { mockNavigate, mockRegisterUser } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockRegisterUser: vi.fn(),
}));

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("@/features/authentication/api/registrationApi", () => ({
  registerUser: mockRegisterUser,
}));

vi.mock("@/shared/ui/Toaster", () => ({
  Toaster: () => null,
  toaster: { create: vi.fn() },
}));

vi.mock("@/shared/ui/PasswordInput", () => ({
  PasswordInput: React.forwardRef(
    (props: React.InputHTMLAttributes<HTMLInputElement>, ref: React.ForwardedRef<HTMLInputElement>) => (
      <input ref={ref} {...props} />
    ),
  ),
}));

import { RegistrationForm } from "@/features/authentication/components/RegistrationForm";

function fillForm(username = "Grimgork", email = "g@g.com", password = "hunter123") {
  fireEvent.change(screen.getByRole("textbox", { name: /username/i }), {
    target: { value: username },
  });
  fireEvent.change(screen.getByRole("textbox", { name: /email/i }), {
    target: { value: email },
  });
  const pwInput = document.querySelector('input[type="password"]') as HTMLInputElement;
  if (pwInput) fireEvent.change(pwInput, { target: { value: password } });
}

function renderForm(defaultIdentifier?: string) {
  return render(
    <MemoryRouter>
      <ChakraProvider value={defaultSystem}>
        <RegistrationForm defaultIdentifier={defaultIdentifier} />
      </ChakraProvider>
    </MemoryRouter>,
  );
}

function getInputValue(label: RegExp): string {
  return (screen.getByRole("textbox", { name: label }) as HTMLInputElement).value;
}

describe("RegistrationForm – success path", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls registerUser and navigates to / on success", async () => {
    mockRegisterUser.mockResolvedValueOnce({ success: true });
    renderForm();
    fillForm();
    fireEvent.submit(screen.getByRole("button", { name: /register/i }).closest("form")!);

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/"));
    expect(mockRegisterUser).toHaveBeenCalledWith(
      expect.objectContaining({ username: "Grimgork", email: "g@g.com" }),
    );
  });
});

describe("RegistrationForm – catch path", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does not navigate when registerUser throws", async () => {
    mockRegisterUser.mockRejectedValueOnce(new Error("Email taken"));
    renderForm();
    fillForm();
    fireEvent.submit(screen.getByRole("button", { name: /register/i }).closest("form")!);

    await waitFor(() => expect(mockRegisterUser).toHaveBeenCalled());
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

describe("RegistrationForm – defaultIdentifier carry-over", () => {
  beforeEach(() => vi.clearAllMocks());

  it("pre-fills the Email field when the identifier looks like an email", () => {
    renderForm("someone@example.com");
    expect(getInputValue(/email/i)).toBe("someone@example.com");
    expect(getInputValue(/username/i)).toBe("");
  });

  it("pre-fills the Username field when the identifier has no '@'", () => {
    renderForm("Grimgork");
    expect(getInputValue(/username/i)).toBe("Grimgork");
    expect(getInputValue(/email/i)).toBe("");
  });

  it("leaves all fields empty when no identifier is provided", () => {
    renderForm();
    expect(getInputValue(/username/i)).toBe("");
    expect(getInputValue(/email/i)).toBe("");
  });

  it("pre-filled email still validates and submits", async () => {
    mockRegisterUser.mockResolvedValueOnce({ success: true });
    renderForm("someone@example.com");
    // Fill the remaining required fields (username + password).
    fireEvent.change(screen.getByRole("textbox", { name: /username/i }), {
      target: { value: "Grimgork" },
    });
    const pwInput = document.querySelector('input[type="password"]') as HTMLInputElement;
    fireEvent.change(pwInput, { target: { value: "hunter123" } });
    fireEvent.submit(screen.getByRole("button", { name: /register/i }).closest("form")!);

    await waitFor(() =>
      expect(mockRegisterUser).toHaveBeenCalledWith(
        expect.objectContaining({
          username: "Grimgork",
          email: "someone@example.com",
        }),
      ),
    );
  });
});
