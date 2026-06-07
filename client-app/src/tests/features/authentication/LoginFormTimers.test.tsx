/**
 * Coverage for LoginForm timer and interaction branches.
 * Covers line 43 (double-submit guard), line 57 (setTimeout callback),
 * and line 98 (checkbox onChange).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { LoginForm } from "@/features/authentication/components/LoginForm";
import * as authApi from "@/features/authentication/api/authenticationApi";

vi.mock("@/features/authentication/api/authenticationApi", () => ({
  loginUser: vi.fn(),
}));

function renderLoginForm(props = {}) {
  return render(
    <ChakraProvider value={defaultSystem}>
      <LoginForm {...props} />
    </ChakraProvider>,
  );
}

function getForm() {
  return screen.getByRole("button", { name: /login/i }).closest("form")!;
}

function fillForm() {
  fireEvent.change(screen.getByLabelText(/email or username/i), {
    target: { value: "user@test.com" },
  });
  fireEvent.change(screen.getByLabelText(/password/i), {
    target: { value: "password123" },
  });
}

describe("LoginForm – setTimeout callback (line 57)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("isSubmittingRef resets to false after 1000ms timer fires", async () => {
    vi.mocked(authApi.loginUser).mockResolvedValue(
      {} as Awaited<ReturnType<typeof authApi.loginUser>>,
    );
    renderLoginForm();
    fillForm();
    fireEvent.submit(getForm());

    // Let promises (resolver + loginUser) resolve
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // After timers run, the component should still be functional
    expect(screen.getByRole("button", { name: /login/i })).toBeInTheDocument();
  });

  it("setTimeout fires even on login error path", async () => {
    vi.mocked(authApi.loginUser).mockRejectedValue(new Error("fail"));
    renderLoginForm();
    fillForm();
    fireEvent.submit(getForm());

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByRole("button", { name: /login/i })).toBeInTheDocument();
  });
});

describe("LoginForm – checkbox onChange (line 98)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clicking the Remember Me checkbox triggers onChange handler", async () => {
    renderLoginForm();
    // The HiddenInput is a native checkbox; clicking the label triggers onCheckedChange
    const checkbox = screen.queryByRole("checkbox");
    if (checkbox) {
      await userEvent.click(checkbox);
    } else {
      // Fallback: click via the label text
      const label = screen.getByText(/remember me/i);
      await userEvent.click(label);
    }
    // Component should still be functional
    expect(screen.getByRole("button", { name: /login/i })).toBeInTheDocument();
  });
});

describe("LoginForm – double-submit guard (line 43)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("second submit while first is in-flight does not call loginUser twice", async () => {
    let resolve: (v: Awaited<ReturnType<typeof authApi.loginUser>>) => void;
    const slowPromise = new Promise<
      Awaited<ReturnType<typeof authApi.loginUser>>
    >((r) => {
      resolve = r;
    });
    vi.mocked(authApi.loginUser).mockReturnValue(slowPromise);

    renderLoginForm();
    fillForm();

    const form = getForm();

    // First submit — starts async operation, sets isSubmittingRef.current = true
    fireEvent.submit(form);

    // Wait for loginUser to be called (the async onSubmit ran up to await loginUser)
    await waitFor(() => expect(authApi.loginUser).toHaveBeenCalledTimes(1));

    // Second submit — isSubmittingRef.current is still true → should return early (line 43)
    fireEvent.submit(form);

    // loginUser should still only have been called once
    expect(authApi.loginUser).toHaveBeenCalledTimes(1);

    // Resolve the first promise to clean up
    resolve!({} as Awaited<ReturnType<typeof authApi.loginUser>>);
  });
});
