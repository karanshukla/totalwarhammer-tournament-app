import { useEffect } from "react";
import { Center, Heading } from "@chakra-ui/react";
import { Toaster } from "@/shared/ui/Toaster";
import AppShell from "@/shared/ui/AppShell";
import { BrowserRouter, Routes, Route } from "react-router";
import { lazyLoad } from "@/shared/utils/LazyLoad";
import { httpClient } from "@/core/api/httpClient";
import { useUserStore } from "@/shared/stores/userStore";

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
  useEffect(() => {
    // The persisted store survives a server restart, a Redis flush, or plain
    // expiry, so the client can believe it is logged in when it is not. Drop
    // that state as soon as the server says otherwise.
    httpClient.setUnauthorizedHandler(() =>
      useUserStore.getState().clearUser(),
    );
    useUserStore.getState().evictExpiredSession();
    return () => httpClient.setUnauthorizedHandler(null);
  }, []);

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
              <Center h="100%" minH="200px" px={4}>
                <Heading as="h1" size="2xl" textAlign="center">
                  404 - Invalid URL
                </Heading>
              </Center>
            }
          />
        </Routes>
      </AppShell>
      <Toaster />
    </BrowserRouter>
  );
}

export default App;
