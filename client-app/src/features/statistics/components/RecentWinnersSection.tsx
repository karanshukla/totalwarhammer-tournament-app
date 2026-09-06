import React from "react";
import {
  Badge,
  Box,
  For,
  HStack,
  Separator,
  Text,
  VStack,
} from "@chakra-ui/react";
import { LuTrophy } from "react-icons/lu";
import { displayName as dn } from "@/shared/utils/displayName";
import StatsSection from "./StatsSection";
import type { SectionRenderProps } from "../hooks/useStatisticsData";
import type { RecentWinner } from "../api/statisticsApi";

interface RecentWinnersSectionProps extends SectionRenderProps {
  winners: RecentWinner[];
  rangeLabel: string;
}

const RecentWinnersSection: React.FC<RecentWinnersSectionProps> = ({
  winners,
  rangeLabel,
  ...sectionProps
}) => (
  <StatsSection
    icon={<LuTrophy />}
    accent="info.border"
    subtitle={rangeLabel}
    {...sectionProps}
  >
    {winners.length === 0 ? (
      <Text fontSize="sm" color="fg.secondary" fontStyle="italic">
        No tournaments completed in this window.
      </Text>
    ) : (
      <VStack gap={3} alignItems="stretch">
        <For each={winners}>
          {(w, i) => (
            <Box key={`${w.tournamentName}-${w.completedAt}`}>
              {i > 0 && <Separator mb={3} />}
              <HStack justifyContent="space-between" wrap="wrap" gap={2}>
                <VStack align="start" gap={0}>
                  <Text fontSize="sm" fontWeight="semibold" lineClamp={1}>
                    {w.tournamentName}
                  </Text>
                  <Text fontSize="xs" color="fg.secondary">
                    {w.tournamentType}
                  </Text>
                </VStack>
                <VStack align="end" gap={0}>
                  <HStack gap={1}>
                    <LuTrophy
                      size={12}
                      color="var(--chakra-colors-gold-text)"
                    />
                    <Text fontSize="sm" fontWeight="bold" color="gold.text">
                      {dn(w.winnerName)}
                    </Text>
                  </HStack>
                  {w.winnerFaction && (
                    <Badge size="sm" variant="subtle" colorPalette="ink">
                      {w.winnerFaction}
                    </Badge>
                  )}
                </VStack>
              </HStack>
            </Box>
          )}
        </For>
      </VStack>
    )}
  </StatsSection>
);

export default RecentWinnersSection;
