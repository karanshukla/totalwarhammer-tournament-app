import React from "react";
import { Toaster } from "@/shared/ui/toaster";
import AppShell from "@/shared/ui/AppShell";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/tournaments" element={<TournamentsPage />} />
          <Route path="/matches" element={<MatchesPage />} />
          <Route path="/statistics" element={<StatisticsPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Routes>
      </AppShell>
      <Toaster />
    </BrowserRouter>
  );
}

export default App;
