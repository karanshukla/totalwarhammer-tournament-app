import React from "react";
import { Heading, Container, Tabs, For, SimpleGrid } from "@chakra-ui/react";
import { LuUser, LuBrackets, LuTrophy, LuHistory, LuClock } from "react-icons/lu";

const TournamentsPage: React.FC = () => {
  return (
    <Container maxW="container.xl" py={8}>
      <Heading as="h1" size="xl" mb={4}>
        Tournaments
      </Heading>
          <Tabs.Root  defaultValue="members" variant="outline" colorScheme="blue">
            <Tabs.List>
              <Tabs.Trigger value="brackets">
                <LuBrackets />
                Create a Simple Bracket
              </Tabs.Trigger>
              <Tabs.Trigger value="createTournament">
                <LuTrophy />
                Create a Tournament
              </Tabs.Trigger>
              <Tabs.Trigger value="currentTournaments">
                <LuClock />
                View Ongoing Tournaments
              </Tabs.Trigger>
              <Tabs.Trigger value="pasTournaments">
                <LuHistory />
                View Past Tournaments
              </Tabs.Trigger>
            </Tabs.List>
            <Tabs.Content value="brackets">
            </Tabs.Content>
            <Tabs.Content value="createTournament">Create a new Tournament</Tabs.Content>
            <Tabs.Content value="currentTournaments">
              Check ongoing tournaments
            </Tabs.Content>
            <Tabs.Content value="pasTournaments">
              Check past tournaments
            </Tabs.Content>
          </Tabs.Root>
    </Container>
  );
};

export default TournamentsPage;
