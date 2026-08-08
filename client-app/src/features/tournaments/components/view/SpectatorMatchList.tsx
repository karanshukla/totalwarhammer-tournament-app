import React from "react";
import {
  Box,
  Card,
  For,
  Heading,
  HStack,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
import { LuSwords } from "react-icons/lu";
import type { Match } from "@/shared/tournament/types";
import SpectatorMatchCard from "./SpectatorMatchCard";

interface SpectatorMatchListProps {
  matches: Match[];
  cardBg: string;
  borderColor: string;
  mutedBg: string;
}

const SpectatorMatchList: React.FC<SpectatorMatchListProps> = ({
  matches,
  cardBg,
  borderColor,
  mutedBg,
}) => {
  const roundNumbers = [...new Set(matches.map((m) => m.round))].sort(
    (a, b) => a - b,
  );

  return (
    <Card.Root
      gridColumn={{ lg: "1 / -1" }}
      bg={cardBg}
      borderColor={borderColor}
      shadow="sm"
    >
      <Card.Header>
        <HStack gap={2}>
          <LuSwords />
          <Heading size="md">Matches</Heading>
        </HStack>
      </Card.Header>
      <Card.Body>
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
                  <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
                    <For each={matches.filter((m) => m.round === round)}>
                      {(m) => (
                        <SpectatorMatchCard
                          key={m._id}
                          match={m}
                          borderColor={borderColor}
                          mutedBg={mutedBg}
                        />
                      )}
                    </For>
                  </SimpleGrid>
                </Box>
              )}
            </For>
          </VStack>
        )}
      </Card.Body>
    </Card.Root>
  );
};

export default SpectatorMatchList;
