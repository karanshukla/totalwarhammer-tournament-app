/**
 * Branch coverage for AccountPage.tsx:
 * - user.isAuthenticated=false → setIsValidatingSession(false) immediately, shows UnauthenticatedSection
 * - user.isAuthenticated=true, refreshSession resolves valid=true, isGuest=true → GuestAccountSection
 * - user.isAuthenticated=true, isGuest=false, valid=true → AuthenticatedAccountSection
 * - user.isAuthenticated=true, valid=false → navigate("/auth"), clearUser, warning toast, UnauthenticatedSection
 * - user.isAuthenticated=true, refreshSession rejects → setSessionValid(false), UnauthenticatedSection
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { MemoryRouter } from "react-router";

const {
  mockNavigate,
  mockClearUser,
  mockToasterCreate,
  mockRefreshSession,
  mockUseUserStore,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockClearUser: vi.fn(),
  mockToasterCreate: vi.fn(),
  mockRefreshSession: vi.fn(),
  mockUseUserStore: vi.fn(),
}));

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("@/shared/stores/userStore", () => ({
  useUserStore: (
    selector: (s: {
      user: Record<string, unknown>;
      clearUser: () => void;
    }) => unknown,
  ) => mockUseUserStore(selector),
}));

vi.mock("@/features/account/api/accountApi", () => ({
  refreshSession: mockRefreshSession,
}));

vi.mock("@/shared/ui/Toaster", () => ({
  toaster: { create: mockToasterCreate },
}));

vi.mock("@/features/account/components/GuestAccountSection", () => ({
  default: () => <div data-testid="guest-section" />,
}));
vi.mock("@/features/account/components/AuthenticatedAccountSection", () => ({
  default: () => <div data-testid="auth-section" />,
}));
vi.mock("@/features/account/components/UnauthenticatedSection", () => ({
  default: () => <div data-testid="unauth-section" />,
}));

import AccountPage from "@/features/account/components/AccountPage";

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    isAuthenticated: false,
    isGuest: false,
    username: "",
    email: "",
    id: "",
    ...overrides,
  };
}

function renderPage(user: Record<string, unknown>) {
  mockUseUserStore.mockImplementation(
    (
      selector: (s: {
        user: Record<string, unknown>;
        clearUser: () => void;
      }) => unknown,
    ) => selector({ user, clearUser: mockClearUser }),
  );
  return render(
    <MemoryRouter>
      <ChakraProvider value={defaultSystem}>
        <AccountPage />
      </ChakraProvider>
    </MemoryRouter>,
  );
}

describe("AccountPage – unauthenticated (else branch, no refreshSession)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows UnauthenticatedSection immediately when not authenticated", async () => {
    renderPage(makeUser());
    await waitFor(() =>
      expect(screen.getByTestId("unauth-section")).toBeInTheDocument(),
    );
    expect(mockRefreshSession).not.toHaveBeenCalled();
  });
});

describe("AccountPage – authenticated guest, session valid", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows GuestAccountSection after refresh resolves valid=true", async () => {
    mockRefreshSession.mockResolvedValueOnce(true);
    renderPage(makeUser({ isAuthenticated: true, isGuest: true }));
    await waitFor(() =>
      expect(screen.getByTestId("guest-section")).toBeInTheDocument(),
    );
  });
});

describe("AccountPage – authenticated registered user, session valid", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows AuthenticatedAccountSection when authenticated + not guest + valid", async () => {
    mockRefreshSession.mockResolvedValueOnce(true);
    renderPage(makeUser({ isAuthenticated: true, isGuest: false }));
    await waitFor(() =>
      expect(screen.getByTestId("auth-section")).toBeInTheDocument(),
    );
  });
});

describe("AccountPage – authenticated, session invalid (valid=false branch)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("clears the user, warns, and renders UnauthenticatedSection in place", async () => {
    mockRefreshSession.mockResolvedValueOnce(false);
    renderPage(makeUser({ isAuthenticated: true, isGuest: false }));
    await waitFor(() => expect(mockClearUser).toHaveBeenCalled());
    expect(mockToasterCreate).toHaveBeenCalledWith(
      expect.objectContaining({ type: "warning" }),
    );
    expect(await screen.findByTestId("unauth-section")).toBeInTheDocument();
    // There is no /auth route — redirecting there landed the user on the 404
    // page. This page already renders the signed-out view itself.
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

describe("AccountPage – refreshSession rejects (catch branch)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows UnauthenticatedSection when refreshSession throws", async () => {
    mockRefreshSession.mockRejectedValueOnce(new Error("network"));
    renderPage(makeUser({ isAuthenticated: true, isGuest: false }));
    await waitFor(() =>
      expect(screen.getByTestId("unauth-section")).toBeInTheDocument(),
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
