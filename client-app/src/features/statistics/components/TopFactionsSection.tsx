import React from "react";
import { Badge, Box, For, HStack, Text, VStack } from "@chakra-ui/react";
import { LuShield } from "react-icons/lu";
import StatsSection from "./StatsSection";
import type { SectionRenderProps } from "../hooks/useStatisticsData";
import type { TopFaction } from "../api/statisticsApi";

interface TopFactionsSectionProps extends SectionRenderProps {
  factions: TopFaction[];
  rangeLabel: string;
}

const TopFactionsSection: React.FC<TopFactionsSectionProps> = ({
  factions,
  rangeLabel,
  ...sectionProps
}) => {
  const maxWins = factions[0]?.wins ?? 1;

  return (
    <StatsSection
      icon={<LuShield />}
      accent="gold.border"
      subtitle={rangeLabel}
      {...sectionProps}
    >
      {factions.length === 0 ? (
        <Text color="fg.secondary" fontSize="sm">
          No faction data yet.
        </Text>
      ) : (
        <VStack gap={3} alignItems="stretch">
          <For each={factions}>
            {(f, i) => (
              <Box key={f.faction}>
                <HStack justifyContent="space-between" mb={1}>
                  <HStack gap={2}>
                    <Text
                      fontSize="sm"
                      color="fg.secondary"
                      w={5}
                      textAlign="right"
                    >
                      #{i + 1}
                    </Text>
                    <VStack alignItems="flex-start" gap={0}>
                      <Text fontSize="sm" fontWeight="medium">
                        {f.faction}
                      </Text>
                      {f.matchesPlayed !== undefined && (
                        <Text fontSize="xs" color="fg.secondary">
                          {f.matchesPlayed} played · {f.winRate}% win rate
                        </Text>
                      )}
                    </VStack>
                  </HStack>
                  <Badge colorPalette="brass" variant="subtle">
                    {f.wins} {f.wins === 1 ? "win" : "wins"}
                  </Badge>
                </HStack>
                <Box h="6px" bg="bg.muted" borderRadius="full">
                  <Box
                    h="full"
                    borderRadius="full"
                    bg="gold.subtle"
                    borderWidth={1}
                    borderColor="gold.border"
                    style={{ width: `${(f.wins / maxWins) * 100}%` }}
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

export default TopFactionsSection;
