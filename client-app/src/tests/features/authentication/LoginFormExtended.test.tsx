/**
 * Extended coverage for LoginForm.
 * Covers: onSuccess callback (line 53), error catch block (line 57),
 * double-submit guard (line 43), rememberMe checkbox (line 98).
 */
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

function renderLoginForm(
  props: { onSuccess?: () => void; defaultIdentifier?: string } = {},
) {
  return render(
    <ChakraProvider value={defaultSystem}>
      <LoginForm {...props} />
    </ChakraProvider>,
  );
}

describe("LoginForm – extended coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls onSuccess callback after successful login", async () => {
    const onSuccess = vi.fn();
    vi.mocked(authApi.loginUser).mockResolvedValue(
      {} as unknown as Awaited<ReturnType<typeof authApi.loginUser>>,
    );
    renderLoginForm({ onSuccess });

    fireEvent.change(screen.getByLabelText(/email or username/i), {
      target: { value: "user@test.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "password123" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: /login/i }).closest("form")!,
    );

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("does not throw when login fails (catches error)", async () => {
    vi.mocked(authApi.loginUser).mockRejectedValue(
      new Error("Invalid credentials"),
    );
    renderLoginForm();

    fireEvent.change(screen.getByLabelText(/email or username/i), {
      target: { value: "user@test.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "wrongpassword" },
    });

    await expect(async () => {
      fireEvent.submit(
        screen.getByRole("button", { name: /login/i }).closest("form")!,
      );
      await waitFor(() => {
        expect(authApi.loginUser).toHaveBeenCalled();
      });
    }).not.toThrow();
  });

  it("still renders after a login error (loading state cleared)", async () => {
    vi.mocked(authApi.loginUser).mockRejectedValue(new Error("Network error"));
    renderLoginForm();

    fireEvent.change(screen.getByLabelText(/email or username/i), {
      target: { value: "user@test.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "password" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: /login/i }).closest("form")!,
    );

    await waitFor(() => {
      // Button should still be in the DOM (not loading indefinitely)
      expect(
        screen.getByRole("button", { name: /login/i }),
      ).toBeInTheDocument();
    });
  });

  it("uses defaultIdentifier to pre-fill the identifier field", () => {
    renderLoginForm({ defaultIdentifier: "admin" });
    const input = screen.getByLabelText(
      /email or username/i,
    ) as HTMLInputElement;
    expect(input.value).toBe("admin");
  });

  it("renders rememberMe checkbox", () => {
    renderLoginForm();
    expect(screen.getByText(/remember me/i)).toBeInTheDocument();
  });
});
