/**
 * Branch coverage for shared/ui/AppShell.tsx:
 * - isUserLoggedIn=true → shows LogoutButton (not RegisterLogin)
 * - isUserLoggedIn=false → shows RegisterLogin (not LogoutButton)
 * - isUserGuest=true + !isPortrait → shows "Guest Mode" badge in header
 * - isPortrait=false → renders sidebar nav (desktop layout)
 * - isPortrait=true → renders bottom nav (portrait layout)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { MemoryRouter } from "react-router";

const { mockUseUserStore } = vi.hoisted(() => ({
  mockUseUserStore: vi.fn(),
}));

vi.mock("@/shared/stores/userStore", () => ({
  useUserStore: () => mockUseUserStore(),
}));

// Mock useMediaQuery to control portrait/mobile state
vi.mock("@chakra-ui/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@chakra-ui/react")>();
  return {
    ...actual,
    useMediaQuery: vi.fn(() => [false, false]),
  };
});

vi.mock("@/features/authentication/components/RegisterLogin", () => ({
  RegisterLogin: () => <div data-testid="register-login" />,
}));

vi.mock("@/features/authentication/components/LogoutButton", () => ({
  LogoutButton: () => <div data-testid="logout-button" />,
}));

vi.mock("@/shared/ui/NavItems", () => ({
  default: () => <div data-testid="nav-items" />,
}));

vi.mock("@/shared/ui/ColorMode", () => ({
  ColorModeButton: () => <div data-testid="color-mode" />,
}));

import AppShell from "@/shared/ui/AppShell";
import { useMediaQuery } from "@chakra-ui/react";

const mockUseMediaQuery = vi.mocked(useMediaQuery);

function makeUser(isAuthenticated: boolean, isGuest = false) {
  return {
    user: { isAuthenticated, isGuest, username: "Grimgork" },
    isAuthenticated: () => isAuthenticated,
  };
}

function renderShell(
  isPortrait = false,
  isAuthenticated = false,
  isGuest = false,
) {
  // useMediaQuery is called twice: [isPortrait, isMobile]
  mockUseMediaQuery.mockReturnValue([isPortrait, false]);
  mockUseUserStore.mockReturnValue(makeUser(isAuthenticated, isGuest));
  return render(
    <MemoryRouter>
      <ChakraProvider value={defaultSystem}>
        <AppShell>
          <div data-testid="child-content">Content</div>
        </AppShell>
      </ChakraProvider>
    </MemoryRouter>,
  );
}

describe("AppShell – unauthenticated (RegisterLogin shown)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders RegisterLogin when user is not logged in", () => {
    renderShell(false, false);
    expect(screen.getByTestId("register-login")).toBeInTheDocument();
    expect(screen.queryByTestId("logout-button")).not.toBeInTheDocument();
  });
});

describe("AppShell – authenticated (LogoutButton shown)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders LogoutButton when user is logged in", () => {
    renderShell(false, true);
    expect(screen.getByTestId("logout-button")).toBeInTheDocument();
    expect(screen.queryByTestId("register-login")).not.toBeInTheDocument();
  });
});

describe("AppShell – guest mode badge (isUserGuest && !isPortrait)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows 'Guest Mode' badge in header for guest + desktop", () => {
    renderShell(false, true, true);
    expect(screen.getByText(/guest mode/i)).toBeInTheDocument();
  });
});

describe("AppShell – portrait mode (isPortrait=true)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows the short 'TW Tournament' title instead of the full app name", () => {
    renderShell(true, false);
    expect(screen.getByText("TW Tournament")).toBeInTheDocument();
    expect(
      screen.queryByText("Total Warhammer Tournament App"),
    ).not.toBeInTheDocument();
  });

  it("hides the 'Guest Mode' badge even when the user is a guest", () => {
    renderShell(true, true, true);
    expect(screen.queryByText(/guest mode/i)).not.toBeInTheDocument();
  });

  it("renders the bottom nav (NavItems) instead of the sidebar", () => {
    renderShell(true, false);
    expect(screen.getByTestId("nav-items")).toBeInTheDocument();
  });
});

describe("AppShell – desktop mode shows the full app name", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows 'Total Warhammer Tournament App' when not portrait", () => {
    renderShell(false, false);
    expect(
      screen.getByText("Total Warhammer Tournament App"),
    ).toBeInTheDocument();
  });
});

describe("AppShell – renders children", () => {
  beforeEach(() => vi.clearAllMocks());

  it("always renders child content", () => {
    renderShell(false, false);
    expect(screen.getByTestId("child-content")).toBeInTheDocument();
  });
});
