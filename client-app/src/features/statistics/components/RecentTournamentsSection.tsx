import React from "react";
import {
  Badge,
  Box,
  For,
  HStack,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
import { LuTrophy } from "react-icons/lu";
import StatsSection from "./StatsSection";
import type { SectionRenderProps } from "../hooks/useStatisticsData";
import type { RecentTournament } from "../api/statisticsApi";

interface RecentTournamentsSectionProps extends SectionRenderProps {
  tournaments: RecentTournament[];
  rangeLabel: string;
}

const RecentTournamentsSection: React.FC<RecentTournamentsSectionProps> = ({
  tournaments,
  rangeLabel,
  ...sectionProps
}) => (
  <StatsSection
    icon={<LuTrophy />}
    accent="info.border"
    iconColor="info.text"
    subtitle={rangeLabel}
    {...sectionProps}
  >
    <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
      <For each={tournaments}>
        {(t) => (
          <Box
            key={t._id}
            p={3}
            borderRadius="md"
            bg="bg.subtle"
            borderWidth={1}
            borderColor="border.subtle"
            borderTopColor="info.border"
            borderTopWidth="2px"
          >
            <VStack alignItems="flex-start" gap={1}>
              <Text fontWeight="semibold" fontSize="sm" truncate maxW="full">
                {t.name}
              </Text>
              <HStack gap={2}>
                <Badge colorPalette="ink" size="sm" variant="subtle">
                  {t.tournamentType}
                </Badge>
                <Text fontSize="xs" color="fg.secondary">
                  {t.participants.length} players
                </Text>
              </HStack>
              <Text fontSize="xs" color="fg.secondary">
                {new Date(t.createdAt).toLocaleDateString()}
              </Text>
            </VStack>
          </Box>
        )}
      </For>
    </SimpleGrid>
  </StatsSection>
);

export default RecentTournamentsSection;
