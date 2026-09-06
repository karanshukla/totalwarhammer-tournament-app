import React from "react";
import { Badge, For, HStack, Text, VStack } from "@chakra-ui/react";
import { LuUsers } from "react-icons/lu";
import StatsSection from "./StatsSection";
import type { SectionRenderProps } from "../hooks/useStatisticsData";
import type { TopCreator } from "../api/statisticsApi";

interface TopCreatorsSectionProps extends SectionRenderProps {
  creators: TopCreator[];
}

const rankColor = (rank: number) => {
  if (rank === 0) return "gold.text";
  if (rank === 1) return "fg.secondary";
  return "fg.muted";
};

const TopCreatorsSection: React.FC<TopCreatorsSectionProps> = ({
  creators,
  ...sectionProps
}) => (
  <StatsSection
    icon={<LuUsers />}
    accent="brass.border"
    subtitle="All time — creating a tournament isn't a dated event"
    {...sectionProps}
  >
    {creators.length === 0 ? (
      <Text color="fg.secondary" fontSize="sm">
        No data yet.
      </Text>
    ) : (
      <VStack gap={2} alignItems="stretch">
        <For each={creators}>
          {(c, i) => (
            <HStack key={c.username} justifyContent="space-between">
              <HStack gap={2}>
                <Text
                  fontSize="sm"
                  color={rankColor(i)}
                  fontWeight={i < 2 ? "bold" : "normal"}
                  w={5}
                  textAlign="right"
                >
                  #{i + 1}
                </Text>
                <Text fontSize="sm" fontWeight="medium">
                  {c.username}
                </Text>
              </HStack>
              <HStack gap={2}>
                <Badge colorPalette="brass" variant="subtle">
                  {c.tournamentsCreated} created
                </Badge>
                {c.completed > 0 && (
                  <Badge colorPalette="ink" variant="subtle">
                    {c.completed} done
                  </Badge>
                )}
              </HStack>
            </HStack>
          )}
        </For>
      </VStack>
    )}
  </StatsSection>
);

export default TopCreatorsSection;
