import React from "react";
import {
  Box,
  Field,
  Flex,
  HStack,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
import { LuLock } from "react-icons/lu";
import GameSystemToggle from "@/shared/ui/GameSystemToggle";
import type { FactionGame } from "@/shared/constants/factions";
import BannedFactionPicker from "./BannedFactionPicker";
import GuidanceNote from "./GuidanceNote";
import NextStepsPanel from "./NextStepsPanel";
import type { FormatGuidance } from "./formatGuidance";

interface BannedFactionsSectionProps {
  factions: string[];
  banned: string[];
  onBannedChange: (banned: string[]) => void;
  visible: boolean;
  enable40kFactions: boolean;
  onGameChange: (game: FactionGame) => void;
  isGuest: boolean;
  guidance: FormatGuidance;
}

/** Faction ban picker plus the game-system toggle, guidance and next-steps sidebar. */
const BannedFactionsSection: React.FC<BannedFactionsSectionProps> = ({
  factions,
  banned,
  onBannedChange,
  visible,
  enable40kFactions,
  onGameChange,
  isGuest,
  guidance,
}) => (
  <Field.Root>
    <Field.Label>Banned Factions</Field.Label>
    <SimpleGrid columns={{ base: 1, md: 2 }} gap={6} w="full">
      <BannedFactionPicker
        factions={factions}
        banned={banned}
        visible={visible}
        onChange={onBannedChange}
      />

      <Flex direction="column" gap={3} flex={1} minW={0}>
        <HStack
          gap={2}
          p={2}
          borderRadius="md"
          borderWidth={1}
          borderColor="border"
          bg="bg.subtle"
          alignItems="center"
        >
          <Text fontSize="xs" color="fg.muted" fontWeight="medium" flex={1}>
            Factions
          </Text>
          <GameSystemToggle
            value={enable40kFactions ? "40k" : "wh3"}
            onChange={onGameChange}
          />
        </HStack>

        {isGuest && (
          <Box
            p={3}
            borderRadius="md"
            bg="gold.subtle"
            borderWidth={1}
            borderColor="gold.border"
          >
            <HStack gap={2} alignItems="flex-start">
              <Box color="gold.text" flexShrink={0} mt="1px">
                <LuLock size={14} />
              </Box>
              <VStack gap={1} alignItems="flex-start">
                <Text fontSize="sm" fontWeight="semibold" color="gold.text">
                  Registration Required
                </Text>
                <Text fontSize="sm" color="gold.text">
                  Only registered users can create tournaments. Guest users can
                  join and participate.
                </Text>
              </VStack>
            </HStack>
          </Box>
        )}

        {guidance.warnings.map((warning) => (
          <GuidanceNote key={warning} tone="warning">
            {warning}
          </GuidanceNote>
        ))}
        {guidance.infos.map((info) => (
          <GuidanceNote key={info} tone="info">
            {info}
          </GuidanceNote>
        ))}

        <NextStepsPanel />
      </Flex>
    </SimpleGrid>
  </Field.Root>
);

export default BannedFactionsSection;
