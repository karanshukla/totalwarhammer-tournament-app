import React from "react";
import { Box, HStack, VStack, Text } from "@chakra-ui/react";
import { LuTrophy } from "react-icons/lu";
import type { Champion } from "@/shared/tournament/outcome";

interface ChampionBannerProps {
  champion: Champion | null;
  displayName?: (name: string) => string;
  gridColumn?: Record<string, string>;
  mb?: number;
}

const ChampionBanner: React.FC<ChampionBannerProps> = ({
  champion,
  displayName = (name) => name,
  gridColumn,
  mb,
}) => {
  if (!champion) return null;
  return (
    <Box
      mb={mb}
      p={5}
      borderRadius="lg"
      bg="gold.subtle"
      borderWidth={1}
      borderColor="gold.border"
      textAlign="center"
      gridColumn={gridColumn}
    >
      <HStack justifyContent="center" gap={3}>
        <LuTrophy size={24} color="var(--chakra-colors-gold-text)" />
        <VStack gap={0}>
          <Text
            fontSize="xs"
            fontWeight="semibold"
            textTransform="uppercase"
            letterSpacing="wider"
            color="fg.muted"
          >
            Tournament Champion
          </Text>
          <Text fontSize="2xl" fontWeight="bold">
            {displayName(champion.name)}
          </Text>
          {champion.faction && (
            <Text fontSize="sm" color="fg.muted">
              {champion.faction}
            </Text>
          )}
        </VStack>
        <LuTrophy size={24} color="var(--chakra-colors-gold-text)" />
      </HStack>
    </Box>
  );
};

export default ChampionBanner;
