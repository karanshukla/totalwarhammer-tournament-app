/**
 * Branch coverage for AuthenticatedAccountSection.tsx:
 * - Line 37: `user.username || "-"` → shows username when set
 * - Line 37: `user.username || "-"` → shows "-" when username is empty/falsy
 * - user.email is rendered
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";

const mockUseUserStore = vi.fn();

vi.mock("@/shared/stores/userStore", () => ({
  useUserStore: (selector: (s: { user: Record<string, unknown> }) => unknown) =>
    mockUseUserStore(selector),
}));

// Mock all child components to isolate this component
vi.mock("@/features/account/components/UsernameUpdateForm", () => ({
  default: () => <div data-testid="username-form" />,
}));
vi.mock("@/features/account/components/PasswordUpdateForm", () => ({
  default: () => <div data-testid="password-form" />,
}));
vi.mock("@/features/account/components/LogoutButton", () => ({
  default: () => <div data-testid="logout-button" />,
}));
vi.mock("@/features/account/components/DeleteAccountSection", () => ({
  default: () => <div data-testid="delete-section" />,
}));
vi.mock("@/features/account/components/UserStatsCard", () => ({
  default: () => <div data-testid="user-stats-card" />,
}));

import AuthenticatedAccountSection from "@/features/account/components/AuthenticatedAccountSection";

function renderSection(username = "Grimgork", email = "g@g.com") {
  mockUseUserStore.mockImplementation(
    (selector: (s: { user: Record<string, unknown> }) => unknown) =>
      selector({ user: { username, email } }),
  );
  return render(
    <ChakraProvider value={defaultSystem}>
      <AuthenticatedAccountSection />
    </ChakraProvider>,
  );
}

describe("AuthenticatedAccountSection – username display (line 37 branch)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows the actual username when user.username is set (|| left side)", () => {
    renderSection("Grimgork");
    expect(screen.getByText("Grimgork")).toBeInTheDocument();
  });

  it("shows '-' when user.username is empty (|| right side)", () => {
    renderSection("");
    expect(screen.getByText("-")).toBeInTheDocument();
  });

  it("shows the user email", () => {
    renderSection("Hero", "hero@warhammer.com");
    expect(screen.getByText("hero@warhammer.com")).toBeInTheDocument();
  });
});
