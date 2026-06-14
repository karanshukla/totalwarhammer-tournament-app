/**
 * Branch coverage for TournamentsPage.tsx handleHashChange — line 143:
 *   `else if (newHash && !tabs.some((tab) => tab.id === newHash) && activeTab !== tabs[0].id)`
 *
 * False branch: invalid hash fired while already on tabs[0] (brackets).
 * When `activeTab === tabs[0].id`, the condition `activeTab !== tabs[0].id` is false,
 * so the else-if evaluates to false and nothing happens (no state update).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock("@/core/api/httpClient", () => ({
  httpClient: { get: vi.fn(), post: vi.fn() },
}));

vi.mock("@/shared/stores/userStore", () => ({
  useUserStore: vi.fn(() => ({
    user: {
      isAuthenticated: false,
      isGuest: false,
      username: "TestUser",
      id: "uid1",
    },
  })),
}));

vi.mock("@/shared/ui/Toaster", () => ({
  toaster: { create: vi.fn() },
}));

vi.mock("@/shared/ui/NumberInput", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  NumberInputRoot: ({ children }: any) => <div>{children}</div>,
  NumberInputField: () => <input />,
}));

import TournamentsPage from "@/features/tournaments/components/TournamentsPage";

function renderPage() {
  return render(
    <MemoryRouter>
      <ChakraProvider value={defaultSystem}>
        <TournamentsPage />
      </ChakraProvider>
    </MemoryRouter>,
  );
}

describe("TournamentsPage – handleHashChange line 143 false branch", () => {
  beforeEach(() => {
    // Reset hash to ensure we start on first tab (brackets)
    window.location.hash = "#brackets";
  });

  it("does nothing when invalid hash fires and activeTab is already tabs[0] (line 143 false branch)", async () => {
    renderPage();

    // Page starts on first tab (brackets) — activeTab === tabs[0].id
    expect(
      screen.getByText(/create a simple bracket/i),
    ).toBeInTheDocument();

    // Fire hashchange with an invalid tab id while already on brackets tab
    await act(async () => {
      window.location.hash = "#invalid-nonexistent-tab";
      window.dispatchEvent(new Event("hashchange"));
    });

    // Component should still show first tab content — no state change occurred
    // because the else-if at line 143 was false (activeTab === tabs[0].id)
    expect(
      screen.getByText(/create a simple bracket/i),
    ).toBeInTheDocument();
  });

  it("resets to first tab when invalid hash fires and activeTab is NOT tabs[0] (line 143 true branch)", async () => {
    renderPage();

    // Switch to a different tab first
    await act(async () => {
      window.location.hash = "#createTournament";
      window.dispatchEvent(new Event("hashchange"));
    });

    // Now activeTab is createTournament (not tabs[0])
    // Fire another hashchange with invalid hash
    await act(async () => {
      window.location.hash = "#totally-invalid";
      window.dispatchEvent(new Event("hashchange"));
    });

    // The else-if at line 143 should now be true → setActiveTab(tabs[0].id)
    // So brackets content should be visible again
    expect(
      screen.getByText(/create a simple bracket/i),
    ).toBeInTheDocument();
  });
});
