/**
 * Branch coverage for authentication/components/LogoutButton.tsx:
 * - handleLogout guard (line 21): isLoggingOutRef.current=true → early return (double-click prevention)
 * - Success path: logoutUser resolves → navigate("/")
 * - Catch path: logoutUser rejects → still navigate("/")
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { MemoryRouter } from "react-router-dom";

const { mockNavigate, mockLogoutUser } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockLogoutUser: vi.fn(),
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
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

describe("LogoutButton – success path", () => {
  beforeEach(() => vi.clearAllMocks());

  it("navigates to / after successful logout", async () => {
    mockLogoutUser.mockResolvedValueOnce({ success: true, message: "ok" });
    renderButton();
    await userEvent.click(screen.getByRole("button", { name: /logout/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });
});

describe("LogoutButton – catch path", () => {
  beforeEach(() => vi.clearAllMocks());

  it("still navigates to / when logoutUser throws", async () => {
    mockLogoutUser.mockRejectedValueOnce(new Error("Server error"));
    renderButton();
    await userEvent.click(screen.getByRole("button", { name: /logout/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });
});

describe("LogoutButton – double-click guard (line 21 true branch)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("ignores second click while logout is in progress", async () => {
    let resolve!: () => void;
    mockLogoutUser.mockImplementationOnce(
      () => new Promise<void>((r) => { resolve = r; }),
    );

    renderButton();
    const btn = screen.getByRole("button", { name: /logout/i });

    // First click — starts the in-flight logout
    await userEvent.click(btn);
    // Second click should hit the guard and return early
    await userEvent.click(btn);

    // logoutUser should only be called once
    expect(mockLogoutUser).toHaveBeenCalledTimes(1);

    // Resolve the in-flight promise so the component can clean up
    await act(async () => { resolve(); });
  });
});
