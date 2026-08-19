import React from "react";
import { Box, HStack, Text } from "@chakra-ui/react";
import type { Match } from "@/shared/tournament/types";
import { matchStatusSurfaceMap } from "@/shared/tournament/types";
import { MatchStatusBadge } from "@/shared/ui/MatchBadges";
import { MatchupRow, MatchWinnerLine } from "@/shared/ui/MatchupRow";

interface SpectatorMatchCardProps {
  match: Match;
}

/** Read-only view of a match, used on the public tournament page. */
const SpectatorMatchCard: React.FC<SpectatorMatchCardProps> = ({ match }) => {
  const surface = matchStatusSurfaceMap[match.status];

  return (
    <Box
      p={4}
      borderRadius="md"
      borderWidth={1}
      borderColor={surface.borderColor}
      bg={surface.bg}
    >
      <HStack mb={3} justifyContent="space-between">
        <Text fontSize="xs" color="fg.muted">
          Match {match.matchNumber}
        </Text>
        <MatchStatusBadge status={match.status} />
      </HStack>

      <MatchupRow match={match} />

      <MatchWinnerLine match={match} />

      {match.status === "disputed" && (
        <Text
          fontSize="xs"
          color="status.loss"
          mt={3}
          textAlign="center"
          fontWeight="medium"
        >
          Result disputed - awaiting organiser decision
        </Text>
      )}
    </Box>
  );
};

export default SpectatorMatchCard;
