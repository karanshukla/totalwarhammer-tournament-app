/**
 * Branch coverage for LogoutButton.tsx:
 * - try path: logoutUser() resolves → navigate("/") called
 * - catch path: logoutUser() throws → console.error called, no navigate
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { MemoryRouter } from "react-router-dom";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("@/features/authentication/api/authenticationApi", () => ({
  logoutUser: vi.fn(),
}));

import { logoutUser } from "@/features/authentication/api/authenticationApi";
import LogoutButton from "@/features/account/components/LogoutButton";

const mockLogoutUser = vi.mocked(logoutUser);

function renderButton() {
  return render(
    <MemoryRouter>
      <ChakraProvider value={defaultSystem}>
        <LogoutButton />
      </ChakraProvider>
    </MemoryRouter>,
  );
}

describe("LogoutButton – success path (try branch)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("navigates to / after successful logout", async () => {
    mockLogoutUser.mockResolvedValueOnce({ success: true, message: "ok" });

    renderButton();
    await userEvent.click(screen.getByRole("button", { name: /logout/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });
});

describe("LogoutButton – error path (catch branch)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs error and does not navigate when logoutUser throws", async () => {
    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mockLogoutUser.mockRejectedValueOnce(new Error("Server error"));

    renderButton();
    await userEvent.click(screen.getByRole("button", { name: /logout/i }));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "Logout failed:",
        expect.any(Error),
      );
    });

    expect(mockNavigate).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
