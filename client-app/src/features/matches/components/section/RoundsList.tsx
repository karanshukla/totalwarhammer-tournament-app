import React from "react";
import { Badge, Box, HStack } from "@chakra-ui/react";
import SectionLabel from "@/shared/ui/SectionLabel";
import type { Match } from "@/shared/tournament/types";
import MatchGrid, { type MatchGridProps } from "./MatchGrid";

type RoundsListProps = Omit<MatchGridProps, "matches"> & {
  matches: Match[];
  roundNumbers: number[];
  isRoundRobinOrSwiss: boolean;
};

/** One match grid per round, for every format except double elimination. */
const RoundsList: React.FC<RoundsListProps> = ({
  matches,
  roundNumbers,
  isRoundRobinOrSwiss,
  isActive,
  ...gridProps
}) => {
  const maxRound = Math.max(...matches.map((m) => m.round));

  return (
    <>
      {roundNumbers.map((round) => {
        const isCurrentRound = round === maxRound && isActive;
        return (
          <Box key={round}>
            <HStack mb={3} gap={2}>
              <SectionLabel color={isCurrentRound ? "info.text" : "fg.muted"}>
                {isRoundRobinOrSwiss
                  ? `Round ${round} of ${roundNumbers.length}`
                  : `Round ${round}`}
              </SectionLabel>
              {isCurrentRound && !isRoundRobinOrSwiss && (
                <Badge colorPalette="verdigris" size="sm" variant="subtle">
                  Current
                </Badge>
              )}
              {!isCurrentRound && round < maxRound && !isRoundRobinOrSwiss && (
                <Badge colorPalette="ink" size="sm" variant="subtle">
                  Completed
                </Badge>
              )}
            </HStack>
            <MatchGrid
              matches={matches.filter((m) => m.round === round)}
              isActive={isActive}
              {...gridProps}
            />
          </Box>
        );
      })}
    </>
  );
};

export default RoundsList;
