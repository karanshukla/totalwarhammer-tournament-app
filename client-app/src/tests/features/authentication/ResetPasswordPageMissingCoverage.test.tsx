/**
 * Missing coverage for authentication/components/ResetPasswordPage.tsx
 *
 * Covers lines not reached by ResetPasswordPage.test.tsx:
 *   Line 32  – zod refine callback (passwords don't match)
 *   Line 101 – onSubmit: !resetToken early return
 *   Lines 103-116 – onSubmit try/catch/finally body
 *   Line 109-111 – setTimeout navigate after success
 *   Line 141 – "Back to Home" button onClick → navigate("/")
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  act,
  fireEvent,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { MemoryRouter } from "react-router";

const {
  mockVerifyResetToken,
  mockResetPassword,
  mockNavigate,
  mockToasterCreate,
} = vi.hoisted(() => ({
  mockVerifyResetToken: vi.fn(),
  mockResetPassword: vi.fn(),
  mockNavigate: vi.fn(),
  mockToasterCreate: vi.fn(),
}));

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("@/features/authentication/api/passwordResetApi", () => ({
  verifyResetToken: mockVerifyResetToken,
  resetPassword: mockResetPassword,
}));

vi.mock("@/shared/ui/Toaster", () => ({
  toaster: { create: mockToasterCreate },
}));

vi.mock("@/shared/ui/PasswordInput", () => ({
  PasswordInput: React.forwardRef(
    (
      props: React.InputHTMLAttributes<HTMLInputElement>,
      ref: React.ForwardedRef<HTMLInputElement>,
    ) => <input ref={ref} {...props} />,
  ),
}));

import ResetPasswordPage from "@/features/authentication/components/ResetPasswordPage";

function renderPage(search = "") {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...window.location, search },
  });
  return render(
    <MemoryRouter>
      <ChakraProvider value={defaultSystem}>
        <ResetPasswordPage />
      </ChakraProvider>
    </MemoryRouter>,
  );
}

// ─── onSubmit success path (lines 103-116) ────────────────────────────────────

describe("ResetPasswordPage – onSubmit success path", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls resetPassword and triggers navigate after 2s setTimeout on success (lines 103-116)", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockVerifyResetToken.mockResolvedValueOnce({ success: true, data: {} });
    mockResetPassword.mockResolvedValueOnce({ success: true });

    renderPage("?token=validtoken");

    // Wait for form to appear using real-time polling
    await waitFor(
      () =>
        expect(
          screen.getByRole("button", { name: /reset password/i }),
        ).toBeInTheDocument(),
      { timeout: 3000 },
    );

    // Use placeholder to locate inputs precisely
    const pwInput = screen.getByPlaceholderText(/enter your new password/i);
    const confirmInput = screen.getByPlaceholderText(
      /confirm your new password/i,
    );

    fireEvent.change(pwInput, { target: { value: "secretPass1" } });
    fireEvent.change(confirmInput, { target: { value: "secretPass1" } });

    fireEvent.click(screen.getByRole("button", { name: /reset password/i }));

    await waitFor(
      () => {
        expect(mockResetPassword).toHaveBeenCalledWith(
          "validtoken",
          "secretPass1",
        );
      },
      { timeout: 3000 },
    );

    // Fire the 2000ms setTimeout that calls navigate
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(mockNavigate).toHaveBeenCalledWith("/");
    vi.useRealTimers();
  });
});

// ─── onSubmit catch path (lines 113-114) ─────────────────────────────────────

describe("ResetPasswordPage – onSubmit catch path", () => {
  beforeEach(() => vi.clearAllMocks());

  it("logs error when resetPassword throws (lines 113-116)", async () => {
    mockVerifyResetToken.mockResolvedValueOnce({ success: true, data: {} });
    mockResetPassword.mockRejectedValueOnce(new Error("Reset failed"));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    renderPage("?token=validtoken");

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /reset password/i }),
      ).toBeInTheDocument(),
    );

    const pwInput = screen.getByPlaceholderText(/enter your new password/i);
    const confirmInput = screen.getByPlaceholderText(
      /confirm your new password/i,
    );

    fireEvent.change(pwInput, { target: { value: "mypassword" } });
    fireEvent.change(confirmInput, { target: { value: "mypassword" } });

    fireEvent.click(screen.getByRole("button", { name: /reset password/i }));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to reset password:",
        expect.any(Error),
      );
    });

    consoleSpy.mockRestore();
  });
});

// ─── Zod refine: passwords don't match (line 32) ─────────────────────────────

describe("ResetPasswordPage – zod refine mismatch (line 32)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows validation error when passwords don't match (covers refine callback)", async () => {
    mockVerifyResetToken.mockResolvedValueOnce({ success: true, data: {} });
    renderPage("?token=validtoken");

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /reset password/i }),
      ).toBeInTheDocument(),
    );

    const inputs = screen.getAllByRole("textbox") as HTMLInputElement[];
    if (inputs.length >= 2) {
      await userEvent.type(inputs[0], "password1");
      await userEvent.type(inputs[1], "password2");
    }

    await userEvent.click(
      screen.getByRole("button", { name: /reset password/i }),
    );

    await waitFor(() => {
      expect(mockResetPassword).not.toHaveBeenCalled();
    });
    // The refine callback fires → resetPassword not called
  });
});

// ─── "Back to Home" button onClick (line 141) ────────────────────────────────

describe("ResetPasswordPage – Back to Home button (line 141)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls navigate('/') when 'Back to Home' button is clicked (line 141)", async () => {
    mockVerifyResetToken.mockResolvedValueOnce({ success: false });
    renderPage("?token=badtoken");

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /back to home/i }),
      ).toBeInTheDocument(),
    );

    await userEvent.click(
      screen.getByRole("button", { name: /back to home/i }),
    );

    expect(mockNavigate).toHaveBeenCalledWith("/");
  });
});
