import { Toaster } from "@/shared/ui/toaster";
import AppShell from "@/shared/ui/AppShell";
import { RouterProvider, Route } from "@/core/router/RouterContext";
import { HomePage } from "@/features/home/components/HomePage";
import { TournamentsPage } from "@/features/tournaments/components/TournamentsPage";
import { StatisticsPage } from "@/features/statistics/components/StatisticsPage";
import { AccountPage } from "@/features/account/components/AccountPage";
import { RegisterLogin } from "@/features/registration/components/RegisterLogin";

export function App() {
  return (
    <RouterProvider>
      <AppShell>
        <Route path="/" component={HomePage} />
        <Route path="/tournaments" component={TournamentsPage} />
        <Route path="/statistics" component={StatisticsPage} />
        <Route path="/account" component={AccountPage} />
        <Route path="/registerLogin" component={RegisterLogin} />
      </AppShell>
      <Toaster />
    </RouterProvider>
  );
}

export default App;
