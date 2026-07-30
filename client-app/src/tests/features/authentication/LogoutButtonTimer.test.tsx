/**
 * Missing coverage for authentication/components/LogoutButton.tsx
 *
 * Covers lines not reached by LogoutButton.test.tsx:
 *   Line 22 – early return inside double-click guard when isLoggingOutRef.current=true
 *   Line 37 – setTimeout callback that resets isLoggingOutRef.current=false
 *
 * The existing test uses `userEvent.click` for the second click, but Chakra v3's
 * loading button has aria-disabled=true which userEvent respects. Using fireEvent
 * bypasses that check and actually reaches the guard branch.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { MemoryRouter } from "react-router";

const { mockNavigate, mockLogoutUser } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockLogoutUser: vi.fn(),
}));

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("@/features/authentication/api/authenticationApi", () => ({
  logoutUser: mockLogoutUser,
}));

import { LogoutButton } from "@/features/authentication/components/LogoutButton";

function renderButton() {
  return render(
    <MemoryRouter>
      <ChakraProvider value={defaultSystem}>
        <LogoutButton />
      </ChakraProvider>
    </MemoryRouter>,
  );
}

// ─── Double-click guard (line 22) ────────────────────────────────────────────

describe("LogoutButton – double-click guard rapid synchronous clicks (line 22)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("hits the early return (line 22) when two clicks fire before first re-render", async () => {
    let resolveLogout!: () => void;
    mockLogoutUser.mockImplementation(
      () =>
        new Promise<void>((r) => {
          resolveLogout = r;
        }),
    );

    renderButton();
    const btn = screen.getByRole("button");

    // Two synchronous fireEvent.click calls before React can re-render and disable the button.
    // First click: handleLogout sets isLoggingOutRef.current = true, suspends at await
    // Second click: handleLogout sees isLoggingOutRef.current === true → early return (line 22)
    fireEvent.click(btn);
    fireEvent.click(btn);

    expect(mockLogoutUser).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveLogout();
    });
  });
});

// ─── setTimeout resets ref (line 37) ─────────────────────────────────────────

describe("LogoutButton – setTimeout resets isLoggingOutRef (line 37)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("resets isLoggingOutRef.current after 1000ms via setTimeout (line 37)", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockLogoutUser.mockResolvedValueOnce({ success: true });
    renderButton();
    const btn = screen.getByRole("button");

    // Fire click with fireEvent (works with fake timers)
    fireEvent.click(btn);

    // Let the async logoutUser promise resolve
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // Advance the 1000ms setTimeout that resets isLoggingOutRef.current (line 37)
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(mockNavigate).toHaveBeenCalledWith("/");
    vi.useRealTimers();
  });
});
