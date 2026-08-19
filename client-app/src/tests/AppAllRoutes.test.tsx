/**
 * Route coverage for App.tsx – ensures every lazy-loaded route is rendered
 * so that the dynamic import factories are exercised.
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
}));

vi.mock("@/shared/ui/toasterStore", () => ({
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

import App from "@/App";

function renderApp(path: string) {
  window.history.pushState({}, "", path);
  return render(
    <ChakraProvider value={defaultSystem}>
      <App />
    </ChakraProvider>,
  );
}

describe("App – all routes trigger lazy import factories", () => {
  it("renders /tournaments", async () => {
    renderApp("/tournaments");
    await waitFor(() =>
      expect(screen.getByTestId("tournaments-page")).toBeInTheDocument(),
    );
  });

  it("renders /tournament/:id", async () => {
    renderApp("/tournament/abc123");
    await waitFor(() =>
      expect(screen.getByTestId("view-page")).toBeInTheDocument(),
    );
  });

  it("renders /matches/spectate/:code", async () => {
    renderApp("/matches/spectate/ABCDE");
    await waitFor(() =>
      expect(screen.getByTestId("by-code-page")).toBeInTheDocument(),
    );
  });

  it("renders /matches/* (MatchesPage)", async () => {
    renderApp("/matches");
    await waitFor(() =>
      expect(screen.getByTestId("matches-page")).toBeInTheDocument(),
    );
  });

  it("renders /statistics", async () => {
    renderApp("/statistics");
    await waitFor(() =>
      expect(screen.getByTestId("statistics-page")).toBeInTheDocument(),
    );
  });

  it("renders /account", async () => {
    renderApp("/account");
    await waitFor(() =>
      expect(screen.getByTestId("account-page")).toBeInTheDocument(),
    );
  });

  it("renders /contact", async () => {
    renderApp("/contact");
    await waitFor(() =>
      expect(screen.getByTestId("contact-page")).toBeInTheDocument(),
    );
  });

  it("renders /terms", async () => {
    renderApp("/terms");
    await waitFor(() =>
      expect(screen.getByTestId("terms-page")).toBeInTheDocument(),
    );
  });

  it("renders /privacy", async () => {
    renderApp("/privacy");
    await waitFor(() =>
      expect(screen.getByTestId("privacy-page")).toBeInTheDocument(),
    );
  });

  it("renders /reset-password", async () => {
    renderApp("/reset-password");
    await waitFor(() =>
      expect(screen.getByTestId("reset-page")).toBeInTheDocument(),
    );
  });
});
