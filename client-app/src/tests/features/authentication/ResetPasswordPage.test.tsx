/**
 * Branch coverage for authentication/components/ResetPasswordPage.tsx:
 * - No token in URL (useEffect line 83: !token → invalid state) → "Invalid Reset Link"
 * - Token present, verifyResetToken → success=false → "Invalid Reset Link"
 * - Token present, verifyResetToken → success=true + validUntil → shows form with expiry time
 * - Token present, verifyResetToken → success=true + no validUntil → shows form without expiry
 * - Token present, verifyResetToken throws → "Invalid Reset Link"
 * - Loading state (before verifyResetToken resolves): "Verifying Your Reset Link"
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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

vi.mock("@/shared/ui/toasterStore", () => ({
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
  // Set window.location.search for the component's useEffect
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

describe("ResetPasswordPage – no token in URL (line 83 !token branch)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows 'Invalid Reset Link' when no token query param", async () => {
    renderPage("");
    await waitFor(() =>
      expect(screen.getByText(/invalid reset link/i)).toBeInTheDocument(),
    );
    expect(mockVerifyResetToken).not.toHaveBeenCalled();
    expect(mockToasterCreate).toHaveBeenCalledWith(
      expect.objectContaining({ type: "error" }),
    );
  });
});

describe("ResetPasswordPage – loading state", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows 'Verifying Your Reset Link' while verifyResetToken is in flight", () => {
    mockVerifyResetToken.mockReturnValueOnce(new Promise(() => {}));
    renderPage("?token=abc123");
    expect(screen.getByText(/verifying your reset link/i)).toBeInTheDocument();
  });
});

describe("ResetPasswordPage – token invalid (verifyResetToken success=false)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows 'Invalid Reset Link' when token is rejected (success=false)", async () => {
    mockVerifyResetToken.mockResolvedValueOnce({ success: false });
    renderPage("?token=badtoken");
    await waitFor(() =>
      expect(screen.getByText(/invalid reset link/i)).toBeInTheDocument(),
    );
  });
});

describe("ResetPasswordPage – token valid with validUntil (expiryTime branch)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows form and expiry time when token is valid with validUntil", async () => {
    const validUntil = Date.now() + 60 * 60 * 1000;
    mockVerifyResetToken.mockResolvedValueOnce({
      success: true,
      data: { userId: "u1", validUntil },
    });
    renderPage("?token=goodtoken");
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /reset password/i }),
      ).toBeInTheDocument(),
    );
    // expiry time is shown (toLocaleTimeString returns something)
    expect(screen.getByText(/this link will expire at/i)).toBeInTheDocument();
  });
});

describe("ResetPasswordPage – token valid without validUntil (no expiryTime)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows form without expiry text when validUntil is absent", async () => {
    mockVerifyResetToken.mockResolvedValueOnce({ success: true, data: {} });
    renderPage("?token=goodtoken2");
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /reset password/i }),
      ).toBeInTheDocument(),
    );
    expect(
      screen.queryByText(/this link will expire at/i),
    ).not.toBeInTheDocument();
  });
});

describe("ResetPasswordPage – verifyResetToken throws (catch branch)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows 'Invalid Reset Link' when verifyResetToken rejects", async () => {
    mockVerifyResetToken.mockRejectedValueOnce(new Error("Network error"));
    renderPage("?token=errtoken");
    await waitFor(() =>
      expect(screen.getByText(/invalid reset link/i)).toBeInTheDocument(),
    );
    expect(mockToasterCreate).toHaveBeenCalledWith(
      expect.objectContaining({ type: "error" }),
    );
  });
});
