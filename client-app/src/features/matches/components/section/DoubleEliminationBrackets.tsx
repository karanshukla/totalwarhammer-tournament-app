import React from "react";
import { Badge, Box, HStack, Text, VStack } from "@chakra-ui/react";
import { LuTrophy } from "react-icons/lu";
import SectionLabel from "@/shared/ui/SectionLabel";
import type { Match } from "@/shared/tournament/types";
import MatchGrid, { type MatchGridProps } from "./MatchGrid";

type DoubleEliminationBracketsProps = Omit<MatchGridProps, "matches"> & {
  matches: Match[];
};

const roundsOf = (matches: Match[]) =>
  [...new Set(matches.map((m) => m.round))].sort((a, b) => a - b);

/** Winners bracket, losers bracket, and grand final, each in its own column of rounds. */
const DoubleEliminationBrackets: React.FC<DoubleEliminationBracketsProps> = ({
  matches,
  ...gridProps
}) => {
  const winnersMatches = matches.filter((m) => m.bracketSide === "winners");
  const losersMatches = matches.filter((m) => m.bracketSide === "losers");
  const grandFinalMatches = matches.filter(
    (m) => m.bracketSide === "grand_final",
  );
  const winnersRounds = roundsOf(winnersMatches);
  const losersRounds = roundsOf(losersMatches);

  return (
    <>
      {winnersRounds.length > 0 && (
        <Box>
          <HStack mb={3} gap={2}>
            <SectionLabel>Winners Bracket</SectionLabel>
            <Badge colorPalette="ink" size="sm" variant="subtle">
              W
            </Badge>
          </HStack>
          <VStack gap={4} alignItems="stretch">
            {winnersRounds.map((round) => (
              <Box key={`wb-${round}`}>
                <Text fontSize="xs" color="fg.muted" fontWeight="medium" mb={2}>
                  Round {round}
                </Text>
                <MatchGrid
                  matches={winnersMatches.filter((m) => m.round === round)}
                  {...gridProps}
                />
              </Box>
            ))}
          </VStack>
        </Box>
      )}
      {losersRounds.length > 0 && (
        <Box>
          <HStack mb={3} gap={2}>
            <SectionLabel>Losers Bracket</SectionLabel>
            <Badge colorPalette="ink" size="sm" variant="subtle">
              L
            </Badge>
          </HStack>
          <VStack gap={4} alignItems="stretch">
            {losersRounds.map((round) => (
              <Box key={`lb-${round}`}>
                <Text fontSize="xs" color="fg.muted" fontWeight="medium" mb={2}>
                  Round {round}
                </Text>
                <MatchGrid
                  matches={losersMatches.filter((m) => m.round === round)}
                  {...gridProps}
                />
              </Box>
            ))}
          </VStack>
        </Box>
      )}
      {grandFinalMatches.length > 0 && (
        <Box>
          <HStack mb={3} gap={2}>
            <LuTrophy />
            <SectionLabel color="gold.text">Grand Final</SectionLabel>
            {grandFinalMatches.length > 1 && (
              <Badge colorPalette="ink" size="sm" variant="subtle">
                Bracket Reset
              </Badge>
            )}
          </HStack>
          <MatchGrid matches={grandFinalMatches} {...gridProps} />
        </Box>
      )}
    </>
  );
};

export default DoubleEliminationBrackets;
