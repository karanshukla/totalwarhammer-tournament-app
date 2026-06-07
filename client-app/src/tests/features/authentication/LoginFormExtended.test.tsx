import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { LoginForm } from "@/features/authentication/components/LoginForm";
import * as authApi from "@/features/authentication/api/authenticationApi";

vi.mock("@/features/authentication/api/authenticationApi", () => ({
  loginUser: vi.fn(),
}));

function renderLoginForm(props?: { defaultIdentifier?: string; onSuccess?: () => void }) {
  return render(
    <ChakraProvider value={defaultSystem}>
      <LoginForm {...props} />
    </ChakraProvider>,
  );
}

describe("LoginForm - extended coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("calls onSuccess callback when login succeeds", async () => {
    vi.mocked(authApi.loginUser).mockResolvedValueOnce(
      {} as unknown as Awaited<ReturnType<typeof authApi.loginUser>>,
    );
    const onSuccess = vi.fn();
    renderLoginForm({ onSuccess });

    fireEvent.change(screen.getByLabelText(/Email or Username/i), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: "password123" },
    });

    fireEvent.submit(screen.getByRole("button", { name: /Login/i }).closest("form")!);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledOnce();
    });
  });

  it("logs error and does not call onSuccess when login fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(authApi.loginUser).mockRejectedValueOnce(new Error("Invalid credentials"));
    const onSuccess = vi.fn();
    renderLoginForm({ onSuccess });

    fireEvent.change(screen.getByLabelText(/Email or Username/i), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: "wrong-password" },
    });

    fireEvent.submit(screen.getByRole("button", { name: /Login/i }).closest("form")!);

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith("Login failed:", expect.any(Error));
    });
    expect(onSuccess).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("uses defaultIdentifier prop to pre-fill identifier field", () => {
    renderLoginForm({ defaultIdentifier: "prefilled@example.com" });
    const identifierField = screen.getByLabelText(/Email or Username/i);
    expect(identifierField).toHaveValue("prefilled@example.com");
  });

  it("toggles rememberMe checkbox state when clicked", async () => {
    renderLoginForm();
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).not.toBeChecked();

    await userEvent.click(checkbox);
    await waitFor(() => expect(checkbox).toBeChecked());

    await userEvent.click(checkbox);
    await waitFor(() => expect(checkbox).not.toBeChecked());
  });

  it("submits form with rememberMe: true when checkbox is checked", async () => {
    vi.mocked(authApi.loginUser).mockResolvedValueOnce(
      {} as unknown as Awaited<ReturnType<typeof authApi.loginUser>>,
    );

    renderLoginForm();

    fireEvent.change(screen.getByLabelText(/Email or Username/i), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: "password123" },
    });

    await userEvent.click(screen.getByRole("checkbox"));

    fireEvent.submit(screen.getByRole("button", { name: /Login/i }).closest("form")!);

    await waitFor(() => {
      expect(authApi.loginUser).toHaveBeenCalledWith(
        expect.objectContaining({ rememberMe: true }),
      );
    });
  });

  it("prevents double submission when already submitting", async () => {
    let resolveLogin!: () => void;
    vi.mocked(authApi.loginUser).mockReturnValueOnce(
      new Promise<Awaited<ReturnType<typeof authApi.loginUser>>>((res) => {
        resolveLogin = () => res({} as Awaited<ReturnType<typeof authApi.loginUser>>);
      }),
    );

    renderLoginForm();

    fireEvent.change(screen.getByLabelText(/Email or Username/i), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: "password123" },
    });

    const form = screen.getByRole("button", { name: /Login/i }).closest("form")!;

    // Submit twice rapidly
    fireEvent.submit(form);
    fireEvent.submit(form);

    // Resolve the pending login
    await act(async () => {
      resolveLogin();
    });

    // loginUser should only have been called once (isSubmittingRef prevented double-call)
    expect(authApi.loginUser).toHaveBeenCalledTimes(1);
  });

  it("resets isSubmittingRef after 1 second so re-submission is possible", async () => {
    vi.useFakeTimers();
    vi.mocked(authApi.loginUser).mockResolvedValue(
      {} as unknown as Awaited<ReturnType<typeof authApi.loginUser>>,
    );

    renderLoginForm();

    fireEvent.change(screen.getByLabelText(/Email or Username/i), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: "password123" },
    });

    const form = screen.getByRole("button", { name: /Login/i }).closest("form")!;

    // First submit
    fireEvent.submit(form);

    await act(async () => {
      await Promise.resolve(); // flush promises
    });

    // Advance timers past the 1-second reset
    await act(async () => {
      vi.advanceTimersByTime(1100);
    });

    // Second submit should work
    fireEvent.submit(form);

    await act(async () => {
      await Promise.resolve();
    });

    expect(authApi.loginUser).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("shows loading state during form submission", async () => {
    let resolveLogin!: () => void;
    vi.mocked(authApi.loginUser).mockReturnValueOnce(
      new Promise<Awaited<ReturnType<typeof authApi.loginUser>>>((res) => {
        resolveLogin = () => res({} as Awaited<ReturnType<typeof authApi.loginUser>>);
      }),
    );

    renderLoginForm();

    fireEvent.change(screen.getByLabelText(/Email or Username/i), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: "password123" },
    });

    fireEvent.submit(screen.getByRole("button", { name: /Login/i }).closest("form")!);

    // While loading, the button should show loading text
    await waitFor(() => {
      expect(screen.getByText(/Logging in.../i)).toBeInTheDocument();
    });

    await act(async () => {
      resolveLogin();
    });
  });

  it("restores normal button state after failed login", async () => {
    vi.mocked(authApi.loginUser).mockRejectedValueOnce(new Error("Error"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    renderLoginForm();

    fireEvent.change(screen.getByLabelText(/Email or Username/i), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: "password123" },
    });

    fireEvent.submit(screen.getByRole("button", { name: /Login/i }).closest("form")!);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Login/i })).toBeInTheDocument();
    });
  });
});
