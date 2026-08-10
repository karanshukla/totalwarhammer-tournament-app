import React from "react";
import { SimpleGrid, Text, VStack, Icon } from "@chakra-ui/react";
import type { IconType } from "react-icons";
import { SelectableCard } from "@/shared/ui/SelectableCard";

export interface TournamentTab {
  id: string;
  icon: IconType;
  label: string;
}

interface TournamentTabNavProps {
  tabs: TournamentTab[];
  activeTab: string;
  onSelectTab: (id: string) => void;
}

const TournamentTabNav: React.FC<TournamentTabNavProps> = ({
  tabs,
  activeTab,
  onSelectTab,
}) => (
  <SimpleGrid columns={{ base: 2, md: 4 }} gap={4}>
    {tabs.map((tab) => (
      <SelectableCard
        key={tab.id}
        selected={activeTab === tab.id}
        aria-pressed={activeTab === tab.id}
        onClick={() => onSelectTab(tab.id)}
        p={4}
      >
        <VStack gap={3} alignItems="center">
          <Icon as={tab.icon} boxSize={6} />
          <Text fontSize="md" fontWeight="medium" textAlign="center">
            {tab.label}
          </Text>
        </VStack>
      </SelectableCard>
    ))}
  </SimpleGrid>
);

export default TournamentTabNav;
