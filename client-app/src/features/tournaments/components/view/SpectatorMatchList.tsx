import React from "react";
import { Box, For, SimpleGrid, Text, VStack } from "@chakra-ui/react";
import { LuSwords } from "react-icons/lu";
import PanelCard from "@/shared/ui/PanelCard";
import type { Match } from "@/shared/tournament/types";
import SpectatorMatchCard from "./SpectatorMatchCard";

interface SpectatorMatchListProps {
  matches: Match[];
}

const SpectatorMatchList: React.FC<SpectatorMatchListProps> = ({ matches }) => {
  const roundNumbers = [...new Set(matches.map((m) => m.round))].sort(
    (a, b) => a - b,
  );

  return (
    <PanelCard icon={LuSwords} title="Matches" gridColumn={{ lg: "1 / -1" }}>
      {matches.length === 0 ? (
        <Text color="fg.muted" textAlign="center" py={4}>
          No matches yet.
        </Text>
      ) : (
        <VStack gap={6} alignItems="stretch">
          <For each={roundNumbers}>
            {(round) => (
              <Box key={round}>
                <Text
                  fontWeight="semibold"
                  mb={3}
                  fontSize="sm"
                  color="fg.muted"
                  textTransform="uppercase"
                  letterSpacing="wider"
                >
                  Round {round}
                </Text>
                <SimpleGrid
                  columns={{ base: 1, md: 2 }}
                  gap={3}
                  alignItems="start"
                >
                  <For each={matches.filter((m) => m.round === round)}>
                    {(m) => <SpectatorMatchCard key={m._id} match={m} />}
                  </For>
                </SimpleGrid>
              </Box>
            )}
          </For>
        </VStack>
      )}
    </PanelCard>
  );
};

export default SpectatorMatchList;
