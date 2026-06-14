/**
 * Branch coverage for authentication/components/PasswordResetForm.tsx:
 * - onBackClick prop: clicking "Back to Login" calls it
 * - handlePasswordResetSubmit success: requestPasswordReset resolves → onSuccess called
 * - handlePasswordResetSubmit catch: requestPasswordReset rejects → onSuccess NOT called
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";

const { mockRequestPasswordReset } = vi.hoisted(() => ({
  mockRequestPasswordReset: vi.fn(),
}));

vi.mock("@/features/authentication/api/passwordResetApi", () => ({
  requestPasswordReset: mockRequestPasswordReset,
}));

vi.mock("@/shared/ui/Toaster", () => ({
  Toaster: () => null,
  toaster: { create: vi.fn() },
}));

import { PasswordResetForm } from "@/features/authentication/components/PasswordResetForm";

function renderForm(onBackClick = vi.fn(), onSuccess = vi.fn()) {
  return render(
    <ChakraProvider value={defaultSystem}>
      <PasswordResetForm onBackClick={onBackClick} onSuccess={onSuccess} />
    </ChakraProvider>,
  );
}

describe("PasswordResetForm – Back to Login button", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls onBackClick when 'Back to Login' is clicked", async () => {
    const onBackClick = vi.fn();
    renderForm(onBackClick);
    await userEvent.click(screen.getByRole("button", { name: /back to login/i }));
    expect(onBackClick).toHaveBeenCalledTimes(1);
  });
});

describe("PasswordResetForm – success path", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls onSuccess after requestPasswordReset resolves", async () => {
    mockRequestPasswordReset.mockResolvedValueOnce({ success: true, message: "sent" });
    const onSuccess = vi.fn();
    renderForm(vi.fn(), onSuccess);

    fireEvent.change(screen.getByRole("textbox", { name: /email/i }), {
      target: { value: "hero@warhammer.com" },
    });
    fireEvent.submit(screen.getByRole("button", { name: /send reset link/i }).closest("form")!);

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(mockRequestPasswordReset).toHaveBeenCalledWith("hero@warhammer.com");
  });
});

describe("PasswordResetForm – catch path", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does NOT call onSuccess when requestPasswordReset throws", async () => {
    mockRequestPasswordReset.mockRejectedValueOnce(new Error("Not found"));
    const onSuccess = vi.fn();
    renderForm(vi.fn(), onSuccess);

    fireEvent.change(screen.getByRole("textbox", { name: /email/i }), {
      target: { value: "hero@warhammer.com" },
    });
    fireEvent.submit(screen.getByRole("button", { name: /send reset link/i }).closest("form")!);

    await waitFor(() =>
      expect(mockRequestPasswordReset).toHaveBeenCalled(),
    );
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
