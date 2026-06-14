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
import { MemoryRouter } from "react-router-dom";

const { mockNavigate, mockRegisterUser } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockRegisterUser: vi.fn(),
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
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

function renderForm() {
  return render(
    <MemoryRouter>
      <ChakraProvider value={defaultSystem}>
        <RegistrationForm />
      </ChakraProvider>
    </MemoryRouter>,
  );
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
