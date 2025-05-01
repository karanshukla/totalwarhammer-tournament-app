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

export function App() {
  return (
    <RouterProvider>
      <AppShell>
        <Route path="/" component={HomePage} />
        <Route path="/tournaments" component={TournamentsPage} />
        <Route path="/statistics" component={StatisticsPage} />
        <Route path="/account" component={AccountPage} />
      </AppShell>
      <Toaster />
    </RouterProvider>
  );
}

export default App;
