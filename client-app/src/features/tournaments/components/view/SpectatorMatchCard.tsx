import React from "react";
import { Badge, Box, HStack, Text, VStack } from "@chakra-ui/react";
import { LuTrophy } from "react-icons/lu";
import { displayName as dn } from "@/shared/utils/displayName";
import type { Match, MatchStatus, PlayerSlot } from "@/shared/tournament/types";

const statusBadges: Record<MatchStatus, React.ReactNode> = {
  completed: (
    <Badge
      size="sm"
      variant="subtle"
      bg="status.win.subtle"
      color="status.win"
      borderColor="status.win.border"
      borderWidth="1px"
    >
      Completed
    </Badge>
  ),
  disputed: (
    <Badge colorPalette="crimson" size="sm" variant="solid">
      ⚠ Disputed
    </Badge>
  ),
  in_progress: (
    <Badge colorPalette="verdigris" size="sm" variant="subtle">
      In Progress
    </Badge>
  ),
  pending: (
    <Badge colorPalette="ink" size="sm" variant="subtle">
      Pending
    </Badge>
  ),
};

const ResultBadge: React.FC<{ won: boolean }> = ({ won }) => (
  <Badge
    size="sm"
    variant={won ? "subtle" : undefined}
    bg={won ? "status.win.subtle" : "status.loss.subtle"}
    color={won ? "status.win" : "status.loss"}
    borderColor={won ? "status.win.border" : "status.loss.border"}
    borderWidth="1px"
    fontWeight="bold"
  >
    {won ? "W" : "L"}
  </Badge>
);

interface PlayerColumnProps {
  player: PlayerSlot;
  won: boolean;
  decided: boolean;
  align: "flex-start" | "flex-end";
}

const PlayerColumn: React.FC<PlayerColumnProps> = ({
  player,
  won,
  decided,
  align,
}) => (
  <VStack alignItems={align} gap={0} flex={1}>
    <HStack gap={1}>
      {decided && <ResultBadge won={won} />}
      <Text
        fontWeight={won ? "bold" : "medium"}
        color={decided && !won ? "fg.muted" : undefined}
      >
        {dn(player.name)}
      </Text>
    </HStack>
    {player.faction && (
      <Text fontSize="xs" color="fg.muted">
        {player.faction}
      </Text>
    )}
  </VStack>
);

interface SpectatorMatchCardProps {
  match: Match;
  borderColor: string;
  mutedBg: string;
}

/** Read-only view of a match, used on the public tournament page. */
const SpectatorMatchCard: React.FC<SpectatorMatchCardProps> = ({
  match,
  borderColor,
  mutedBg,
}) => {
  const decided = !!match.winnerId;
  const p1Won = match.winnerId === match.player1.participantId;
  const winner = p1Won ? match.player1 : match.player2;

  const accent =
    match.status === "disputed"
      ? { border: "status.loss.border", bg: "status.loss.subtle" }
      : match.status === "completed"
        ? { border: "status.win.border", bg: "status.win.subtle" }
        : { border: borderColor, bg: mutedBg };

  return (
    <Box
      p={4}
      borderRadius="md"
      borderWidth={1}
      borderColor={accent.border}
      bg={accent.bg}
    >
      <HStack mb={2} justifyContent="space-between">
        <Text fontSize="xs" color="fg.muted">
          Match {match.matchNumber}
        </Text>
        {statusBadges[match.status]}
      </HStack>

      <HStack gap={4} justifyContent="space-between" wrap="wrap">
        <PlayerColumn
          player={match.player1}
          won={p1Won}
          decided={decided}
          align="flex-start"
        />
        <Text color="fg.muted" fontWeight="bold">
          vs
        </Text>
        <PlayerColumn
          player={match.player2}
          won={decided && !p1Won}
          decided={decided}
          align="flex-end"
        />
      </HStack>

      {decided && (
        <Box mt={2} pt={2} borderTopWidth={1} borderColor="border">
          <HStack gap={1} justifyContent="center">
            <Box color="gold.text" display="inline-flex">
              <LuTrophy size={12} />
            </Box>
            <Text fontSize="xs" color="fg.muted" fontWeight="medium">
              Winner:{" "}
              <Text as="span" color="gold.text" fontWeight="bold">
                {dn(winner.name)}
              </Text>
            </Text>
          </HStack>
        </Box>
      )}

      {match.status === "disputed" && (
        <Text
          fontSize="xs"
          color="status.loss"
          mt={2}
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
