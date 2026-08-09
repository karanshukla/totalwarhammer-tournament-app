import React, { useMemo } from "react";
import { Heading, Container, VStack, HStack, Box } from "@chakra-ui/react";
import { LuBrackets, LuTrophy, LuHistory, LuClock } from "react-icons/lu";
import SimpleBracket from "./SimpleBracket";
import CreateTournamentForm from "./CreateTournamentForm";
import TournamentBrowser from "./TournamentBrowser";
import TournamentTabNav, { TournamentTab } from "./TournamentTabNav";
import TournamentCodeSearch from "./TournamentCodeSearch";
import { useHashTab } from "../hooks/useHashTab";
import { useUserStore } from "@/shared/stores/userStore";

const TABS: TournamentTab[] = [
  {
    id: "createTournament",
    icon: LuTrophy,
    label: "Create a Tournament",
  },
  {
    id: "currentTournaments",
    icon: LuClock,
    label: "View Ongoing Tournaments",
  },
  {
    id: "pastTournaments",
    icon: LuHistory,
    label: "View Past Tournaments",
  },
  {
    id: "brackets",
    icon: LuBrackets,
    label: "Create a Simple Bracket",
  },
];

const TournamentsPage: React.FC = () => {
  const { user } = useUserStore();
  const isGuest = !user.isAuthenticated || user.isGuest;

  const tabIds = useMemo(() => TABS.map((tab) => tab.id), []);
  const [activeTab, setActiveTab] = useHashTab(tabIds);

  return (
    <Container maxW="container.xl" py={8}>
      <VStack gap={6} align="stretch">
        <HStack gap={4} wrap="wrap" alignItems="flex-end">
          <Heading as="h1" size="xl" flex={1}>
            Tournaments
          </Heading>
          <TournamentCodeSearch />
        </HStack>

        <TournamentTabNav
          tabs={TABS}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
        />

        <Box>
          {activeTab === "brackets" && <SimpleBracket />}
          {activeTab === "createTournament" && (
            <CreateTournamentForm isGuest={isGuest} />
          )}
          {activeTab === "currentTournaments" && (
            <TournamentBrowser
              statusFilter={["pending", "active"]}
              emptyMessage="No open tournaments right now. Create one!"
            />
          )}
          {activeTab === "pastTournaments" && (
            <TournamentBrowser
              statusFilter="completed"
              emptyMessage="No completed tournaments yet."
            />
          )}
        </Box>
      </VStack>
    </Container>
  );
};

export default TournamentsPage;
