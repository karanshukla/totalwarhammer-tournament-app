/**
 * Branch coverage for authentication/components/RegisterLogin.tsx:
 * - Button click → opens drawer (handleClick → drawer.open)
 * - auth-event "close-drawer" → drawer.close called
 * - auth-event "open-drawer" → handleClick called (drawer.open)
 * - title && (...) → Drawer header shown with title
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";

vi.mock("@/features/authentication/components/AuthenticationForm", () => ({
  AuthenticationForm: () => <div data-testid="auth-form" />,
}));

import { RegisterLogin } from "@/features/authentication/components/RegisterLogin";

function renderRegisterLogin() {
  return render(
    <ChakraProvider value={defaultSystem}>
      <RegisterLogin />
    </ChakraProvider>,
  );
}

describe("RegisterLogin – initial render", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders Register/Login button", () => {
    renderRegisterLogin();
    expect(
      screen.getByRole("button", { name: /register\/login/i }),
    ).toBeInTheDocument();
  });
});

describe("RegisterLogin – button click opens drawer", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows drawer with 'Authentication' title after clicking button", async () => {
    renderRegisterLogin();
    fireEvent.click(screen.getByRole("button", { name: /register\/login/i }));
    await waitFor(() =>
      expect(screen.getByText("Authentication")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("auth-form")).toBeInTheDocument();
  });
});

describe("RegisterLogin – auth-event open-drawer", () => {
  beforeEach(() => vi.clearAllMocks());

  it("opens drawer when auth-event with type='open-drawer' is dispatched", async () => {
    renderRegisterLogin();
    const event = new CustomEvent("auth-event", {
      detail: { type: "open-drawer" },
    });
    document.dispatchEvent(event);
    await waitFor(() =>
      expect(screen.getByText("Authentication")).toBeInTheDocument(),
    );
  });
});

describe("RegisterLogin – auth-event close-drawer", () => {
  beforeEach(() => vi.clearAllMocks());

  it("closes drawer when auth-event with type='close-drawer' is dispatched after open", async () => {
    renderRegisterLogin();
    // Open the drawer first
    fireEvent.click(screen.getByRole("button", { name: /register\/login/i }));
    await waitFor(() =>
      expect(screen.getByText("Authentication")).toBeInTheDocument(),
    );
    // Now close via auth-event
    const closeEvent = new CustomEvent("auth-event", {
      detail: { type: "close-drawer" },
    });
    document.dispatchEvent(closeEvent);
    await waitFor(() =>
      expect(screen.queryByText("Authentication")).not.toBeInTheDocument(),
    );
  });
});
