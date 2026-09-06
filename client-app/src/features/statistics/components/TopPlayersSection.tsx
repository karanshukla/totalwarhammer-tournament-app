import React from "react";
import { Badge, Box, For, HStack, Text, VStack } from "@chakra-ui/react";
import { LuTrophy } from "react-icons/lu";
import StatsSection from "./StatsSection";
import type { SectionRenderProps } from "../hooks/useStatisticsData";
import type { TopPlayer } from "../api/statisticsApi";

interface TopPlayersSectionProps extends SectionRenderProps {
  players: TopPlayer[];
  rangeLabel: string;
}

const rankColor = (rank: number) => {
  if (rank === 0) return "gold.text";
  if (rank === 1) return "fg.secondary";
  return "fg.muted";
};

const TopPlayersSection: React.FC<TopPlayersSectionProps> = ({
  players,
  rangeLabel,
  ...sectionProps
}) => {
  const maxWins = players[0]?.wins ?? 1;

  return (
    <StatsSection
      icon={<LuTrophy />}
      accent="gold.border"
      subtitle={rangeLabel}
      {...sectionProps}
    >
      {players.length === 0 ? (
        <Text color="fg.secondary" fontSize="sm">
          No player data yet.
        </Text>
      ) : (
        <VStack gap={3} alignItems="stretch">
          <For each={players}>
            {(p, i) => (
              <Box key={p.name}>
                <HStack justifyContent="space-between" mb={1}>
                  <HStack gap={2}>
                    <Text
                      fontSize="sm"
                      color={rankColor(i)}
                      w={5}
                      textAlign="right"
                      fontWeight={i < 3 ? "bold" : "normal"}
                    >
                      #{i + 1}
                    </Text>
                    <VStack alignItems="flex-start" gap={0}>
                      <Text fontSize="sm" fontWeight="medium">
                        {p.name}
                      </Text>
                      {p.matchesPlayed !== undefined && (
                        <Text fontSize="xs" color="fg.secondary">
                          {p.matchesPlayed} played · {p.losses} lost ·{" "}
                          {p.winRate}% win rate
                        </Text>
                      )}
                      {p.factions.filter(Boolean).length > 0 && (
                        <Text fontSize="xs" color="fg.secondary">
                          {p.factions.filter(Boolean).join(", ")}
                        </Text>
                      )}
                    </VStack>
                  </HStack>
                  <Badge colorPalette="brass" variant="subtle">
                    {p.wins} {p.wins === 1 ? "win" : "wins"}
                  </Badge>
                </HStack>
                <Box h="6px" bg="bg.muted" borderRadius="full">
                  <Box
                    h="full"
                    borderRadius="full"
                    bg="brass.subtle"
                    borderWidth={1}
                    borderColor="brass.muted"
                    style={{ width: `${(p.wins / maxWins) * 100}%` }}
                  />
                </Box>
              </Box>
            )}
          </For>
        </VStack>
      )}
    </StatsSection>
  );
};

export default TopPlayersSection;
