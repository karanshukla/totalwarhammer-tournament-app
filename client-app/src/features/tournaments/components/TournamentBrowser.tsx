import React from "react";
import { For, SimpleGrid, Spinner, Text, VStack } from "@chakra-ui/react";
import { useUserStore } from "@/shared/stores/userStore";
import Callout from "@/shared/ui/Callout";
import {
  useTournamentList,
  type TournamentStatusFilter,
} from "./browser/useTournamentList";
import { isAlreadyJoined } from "./browser/isAlreadyJoined";
import TournamentCard from "./browser/TournamentCard";

interface TournamentBrowserProps {
  statusFilter: TournamentStatusFilter;
  emptyMessage: string;
}

const TournamentBrowser: React.FC<TournamentBrowserProps> = ({
  statusFilter,
  emptyMessage,
}) => {
  const { tournaments, loading, error } = useTournamentList(statusFilter);
  const { user, isAuthenticated } = useUserStore();

  if (loading) {
    return (
      <VStack gap={4} py={8}>
        <Spinner role="status" aria-label="Loading tournaments" />
        <Text color="fg.muted">Loading tournaments...</Text>
      </VStack>
    );
  }

  if (error) {
    return <Callout tone="error">{error}</Callout>;
  }

  return (
    <VStack gap={4} alignItems="stretch">
      {tournaments.length === 0 ? (
        <Text color="fg.muted" py={8} textAlign="center">
          {emptyMessage}
        </Text>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
          <For each={tournaments}>
            {(t) => (
              <TournamentCard
                key={t._id}
                tournament={t}
                joined={isAlreadyJoined(t, user)}
                isAuthenticated={isAuthenticated()}
              />
            )}
          </For>
        </SimpleGrid>
      )}
    </VStack>
  );
};

export default TournamentBrowser;
