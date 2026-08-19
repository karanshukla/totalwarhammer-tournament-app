import React from "react";
import { Box, Grid, HStack, Text, VStack } from "@chakra-ui/react";
import { LuTrophy } from "react-icons/lu";
import { displayName as dn } from "@/shared/utils/displayName";
import { ResultBadge } from "@/shared/ui/MatchBadges";
import type { Match, PlayerSlot } from "@/shared/tournament/types";

const BYE = "BYE";

interface PlayerSideProps {
  player: PlayerSlot;
  won: boolean;
  decided: boolean;
  align: "flex-start" | "flex-end";
}

const PlayerSide: React.FC<PlayerSideProps> = ({
  player,
  won,
  decided,
  align,
}) => {
  const isBye = player.name === BYE;
  const lost = decided && !won && !isBye;
  const textAlign = align === "flex-end" ? "right" : "left";

  return (
    <VStack alignItems={align} gap={0} minW={0}>
      <HStack gap={1}>
        {decided && !isBye && <ResultBadge won={won} />}
        <Text
          fontWeight={won ? "bold" : "medium"}
          color={isBye || lost ? "fg.muted" : undefined}
          fontStyle={isBye ? "italic" : undefined}
          textAlign={textAlign}
        >
          {dn(player.name)}
        </Text>
      </HStack>
      {player.faction && !isBye && (
        <Text fontSize="xs" color="fg.muted" textAlign={textAlign}>
          {player.faction}
        </Text>
      )}
    </VStack>
  );
};

/**
 * The two players either side of "vs". A fixed 1fr/auto/1fr grid keeps the
 * separator centred no matter how long the names are.
 */
export const MatchupRow: React.FC<{ match: Match }> = ({ match }) => {
  const decided = !!match.winnerId;
  const p1Won = match.winnerId === match.player1.participantId;

  return (
    <Grid templateColumns="1fr auto 1fr" alignItems="center" columnGap={4}>
      <PlayerSide
        player={match.player1}
        won={p1Won}
        decided={decided}
        align="flex-start"
      />
      <Text color="fg.muted" fontWeight="bold" fontSize="sm">
        vs
      </Text>
      <PlayerSide
        player={match.player2}
        won={decided && !p1Won}
        decided={decided}
        align="flex-end"
      />
    </Grid>
  );
};

export const MatchWinnerLine: React.FC<{ match: Match }> = ({ match }) => {
  if (!match.winnerId) return null;
  const winner =
    match.winnerId === match.player1.participantId
      ? match.player1
      : match.player2;

  return (
    <HStack gap={1} justifyContent="center" mt={3}>
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
  );
};
