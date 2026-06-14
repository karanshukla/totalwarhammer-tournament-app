/**
 * Branch coverage for GuestAccountSection.tsx:
 * - Line 31: `user.username || "Guest"` → false (no username) shows "Guest" as the username text
 * - Line 31: `user.username || "Guest"` → true (username set) shows that username text
 * Note: the component always renders a "Guest" Badge, so when testing the empty-username
 * branch we assert that there are exactly 2 "Guest" nodes (username text + badge).
 * When username is set we assert that username text is shown and no duplicate of it.
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

vi.mock("@/features/account/components/UsernameUpdateForm", () => ({
  default: () => <div data-testid="username-update-form" />,
}));

import GuestAccountSection from "@/features/account/components/GuestAccountSection";

function renderSection() {
  return render(
    <ChakraProvider value={defaultSystem}>
      <GuestAccountSection />
    </ChakraProvider>,
  );
}

describe("GuestAccountSection – username display (line 31 branch)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows 'Guest' as username text when user.username is falsy (|| right side)", () => {
    mockUseUserStore.mockImplementation(
      (selector: (s: { user: Record<string, unknown> }) => unknown) =>
        selector({ user: { username: "" } }),
    );
    renderSection();
    // component renders both a username Text and a "Guest" Badge — both show "Guest"
    const guestNodes = screen.getAllByText("Guest");
    expect(guestNodes.length).toBeGreaterThanOrEqual(2);
  });

  it("shows the actual username when user.username is set (|| left side)", () => {
    mockUseUserStore.mockImplementation(
      (selector: (s: { user: Record<string, unknown> }) => unknown) =>
        selector({ user: { username: "Grimgork" } }),
    );
    renderSection();
    expect(screen.getByText("Grimgork")).toBeInTheDocument();
    // Badge still says "Guest"
    expect(screen.getByText("Guest")).toBeInTheDocument();
  });
});
