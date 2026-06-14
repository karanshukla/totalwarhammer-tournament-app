/**
 * Branch coverage for account/components/LogoutButton.tsx:
 * - success: logoutUser resolves → navigate("/") called
 * - catch: logoutUser rejects → navigate NOT called, isSubmitting reset
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { MemoryRouter } from "react-router-dom";

const { mockLogoutUser, mockNavigate } = vi.hoisted(() => ({
  mockLogoutUser: vi.fn(),
  mockNavigate: vi.fn(),
}));

vi.mock("@/features/authentication/api/authenticationApi", () => ({
  logoutUser: mockLogoutUser,
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

import LogoutButton from "@/features/account/components/LogoutButton";

function renderButton(props = {}) {
  return render(
    <MemoryRouter>
      <ChakraProvider value={defaultSystem}>
        <LogoutButton {...props} />
      </ChakraProvider>
    </MemoryRouter>,
  );
}

describe("account/LogoutButton – success branch", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders 'Logout' button", () => {
    mockLogoutUser.mockResolvedValue(undefined);
    renderButton();
    expect(screen.getByRole("button", { name: /logout/i })).toBeInTheDocument();
  });

  it("navigates to '/' after successful logout", async () => {
    mockLogoutUser.mockResolvedValueOnce(undefined);
    renderButton();
    fireEvent.click(screen.getByRole("button", { name: /logout/i }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/"));
  });
});

describe("account/LogoutButton – catch branch", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does NOT navigate when logoutUser throws", async () => {
    mockLogoutUser.mockRejectedValueOnce(new Error("Network error"));
    renderButton();
    fireEvent.click(screen.getByRole("button", { name: /logout/i }));
    await waitFor(() => expect(mockLogoutUser).toHaveBeenCalled());
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
