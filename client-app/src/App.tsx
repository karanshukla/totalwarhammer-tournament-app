import { Toaster } from "@/shared/ui/Toaster";
import AppShell from "@/shared/ui/AppShell";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazyLoad } from "@/shared/utils/LazyLoad";

const HomePage = lazyLoad(() => import("@/features/home/components/HomePage"));
const TournamentsPage = lazyLoad(
  () => import("@/features/tournaments/components/TournamentsPage"),
);
const StatisticsPage = lazyLoad(
  () => import("@/features/statistics/components/StatisticsPage"),
);
const AccountPage = lazyLoad(
  () => import("@/features/account/components/AccountPage"),
);
const MatchesPage = lazyLoad(
  () => import("@/features/matches/components/MatchesPage"),
);
const TournamentViewPage = lazyLoad(
  () => import("@/features/tournaments/components/TournamentViewPage"),
);
const TournamentByCode = lazyLoad(
  () => import("@/features/tournaments/components/TournamentByCode"),
);
const ContactPage = lazyLoad(
  () => import("@/features/contact/components/ContactPage"),
);
const TermsPage = lazyLoad(
  () => import("@/features/terms/components/TermsPage"),
);
const PrivacyPolicyPage = lazyLoad(
  () => import("@/features/terms/components/PrivacyPolicyPage"),
);
const ResetPasswordPage = lazyLoad(
  () => import("@/features/authentication/components/ResetPasswordPage"),
);

export function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/tournaments" element={<TournamentsPage />} />
          <Route path="/tournament/:id" element={<TournamentViewPage />} />
          <Route
            path="/matches/spectate/:code"
            element={<TournamentByCode />}
          />
          <Route path="/matches/*" element={<MatchesPage />} />
          <Route path="/statistics" element={<StatisticsPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route
            path="*"
            element={
              <div className="flex items-center justify-center h-screen text-2xl font-bold text-gray-700">
                404 - Invalid URL
              </div>
            }
          />
        </Routes>
      </AppShell>
      <Toaster />
    </BrowserRouter>
  );
}

export default App;
