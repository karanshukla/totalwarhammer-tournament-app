import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { LoginForm } from "@/features/authentication/components/LoginForm";
import * as authApi from "@/features/authentication/api/authenticationApi";

vi.mock("@/features/authentication/api/authenticationApi", () => ({
  loginUser: vi.fn(),
}));

function renderLoginForm() {
  return render(
    <ChakraProvider value={defaultSystem}>
      <LoginForm />
    </ChakraProvider>,
  );
}

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders email and password fields", () => {
    renderLoginForm();
    expect(screen.getByLabelText(/Email or Username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Login/i })).toBeInTheDocument();
  });

  it("shows validation errors for empty fields", async () => {
    renderLoginForm();
    const loginButton = screen.getByRole("button", { name: /Login/i });
    const form = loginButton.closest("form")!;

    // Trigger submission
    fireEvent.submit(form);

    await waitFor(
      () => {
        expect(
          screen.getByText("Username or email is required"),
        ).toBeInTheDocument();
        expect(screen.getByText("Password is required")).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  it("calls loginUser with form data on successful submit", async () => {
    vi.mocked(authApi.loginUser).mockResolvedValue(
      {} as unknown as Awaited<ReturnType<typeof authApi.loginUser>>,
    );
    renderLoginForm();

    fireEvent.change(screen.getByLabelText(/Email or Username/i), {
      target: { value: "test@test.com" },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: "password123" },
    });

    const loginButton = screen.getByRole("button", { name: /Login/i });
    fireEvent.submit(loginButton.closest("form")!);

    await waitFor(() => {
      expect(authApi.loginUser).toHaveBeenCalledWith({
        identifier: "test@test.com",
        password: "password123",
        rememberMe: false,
      });
    });
  });
});
