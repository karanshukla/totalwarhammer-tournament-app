/**
 * Smoke + route tests for App.tsx:
 * - renders without crashing
 * - 404 route renders "404 - Invalid URL"
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";

vi.mock("@/shared/ui/AppShell", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/shared/ui/Toaster", () => ({
  Toaster: () => null,
  toaster: { create: vi.fn() },
}));

vi.mock("@/features/home/components/HomePage", () => ({
  default: () => <div data-testid="home-page">Home</div>,
}));
vi.mock("@/features/tournaments/components/TournamentsPage", () => ({
  default: () => <div data-testid="tournaments-page">Tournaments</div>,
}));
vi.mock("@/features/statistics/components/StatisticsPage", () => ({
  default: () => <div data-testid="statistics-page">Statistics</div>,
}));
vi.mock("@/features/account/components/AccountPage", () => ({
  default: () => <div data-testid="account-page">Account</div>,
}));
vi.mock("@/features/matches/components/MatchesPage", () => ({
  default: () => <div data-testid="matches-page">Matches</div>,
}));
vi.mock("@/features/tournaments/components/TournamentViewPage", () => ({
  default: () => <div data-testid="view-page">View</div>,
}));
vi.mock("@/features/tournaments/components/TournamentByCode", () => ({
  default: () => <div data-testid="by-code-page">ByCode</div>,
}));
vi.mock("@/features/contact/components/ContactPage", () => ({
  default: () => <div data-testid="contact-page">Contact</div>,
}));
vi.mock("@/features/terms/components/TermsPage", () => ({
  default: () => <div data-testid="terms-page">Terms</div>,
}));
vi.mock("@/features/terms/components/PrivacyPolicyPage", () => ({
  default: () => <div data-testid="privacy-page">Privacy</div>,
}));
vi.mock("@/features/authentication/components/ResetPasswordPage", () => ({
  default: () => <div data-testid="reset-page">Reset</div>,
}));

// Import after mocks
import App from "@/App";

function renderApp(path = "/") {
  // BrowserRouter uses window.location; set it before render
  window.history.pushState({}, "", path);
  return render(
    <ChakraProvider value={defaultSystem}>
      <App />
    </ChakraProvider>,
  );
}

describe("App – routing", () => {
  it("renders home page at /", async () => {
    renderApp("/");
    await waitFor(() =>
      expect(screen.getByTestId("home-page")).toBeInTheDocument(),
    );
  });

  it("renders 404 page at unknown route", async () => {
    renderApp("/this-does-not-exist");
    await waitFor(() =>
      expect(screen.getByText(/404 - Invalid URL/i)).toBeInTheDocument(),
    );
  });
});
