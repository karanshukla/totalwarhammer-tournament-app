import React from "react";
import { Toaster } from "@/shared/ui/toaster";
import AppShell from "@/shared/ui/AppShell";
import { RouterProvider, Route } from "@/core/router/RouterContext";
import { lazyLoad } from "@/shared/utils/lazyLoad";

const HomePage = lazyLoad(() => import("@/features/home/components/HomePage"));
const TournamentsPage = lazyLoad(
  () => import("@/features/tournaments/components/TournamentsPage")
);
const StatisticsPage = lazyLoad(
  () => import("@/features/statistics/components/StatisticsPage")
);
const AccountPage = lazyLoad(
  () => import("@/features/account/components/AccountPage")
);
const MatchesPage = lazyLoad(
  () => import("@/features/matches/components/MatchesPage")
);
const ContactPage = lazyLoad(
  () => import("@/features/contact/components/ContactPage")
);
const TermsPage = lazyLoad(
  () => import("@/features/terms/components/TermsPage")
);
const ResetPasswordPage = lazyLoad(
  () => import("@/features/authentication/components/ResetPasswordPage")
);

export function App() {
  return (
    <RouterProvider>
      <AppShell>
        <Route path="/" component={HomePage} />
        <Route path="/tournaments" component={TournamentsPage} />
        <Route path="/matches" component={MatchesPage} />
        <Route path="/statistics" component={StatisticsPage} />
        <Route path="/account" component={AccountPage} />
        <Route path="/contact" component={ContactPage} />
        <Route path="/terms" component={TermsPage} />
        <Route path="/reset-password" component={ResetPasswordPage} />
      </AppShell>
      <Toaster />
    </RouterProvider>
  );
}

export default App;
