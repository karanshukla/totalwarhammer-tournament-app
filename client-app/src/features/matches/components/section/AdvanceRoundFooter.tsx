import React from "react";
import { Badge, Button, Card, Flex, HStack, Text } from "@chakra-ui/react";
import { LuChevronsRight } from "react-icons/lu";
import type { Match } from "@/shared/tournament/types";

interface AdvanceRoundFooterProps {
  matches: Match[];
  roundNumbers: number[];
  isRoundRobin: boolean;
  isSwiss: boolean;
  participantCount: number;
  actionLoading: boolean;
  onAdvanceRound: () => void;
}

/** Sticky footer with match-completion progress and the organiser's advance/finalize control. */
const AdvanceRoundFooter: React.FC<AdvanceRoundFooterProps> = ({
  matches,
  roundNumbers,
  isRoundRobin,
  isSwiss,
  participantCount,
  actionLoading,
  onAdvanceRound,
}) => {
  const completedCount = matches.filter((m) => m.status === "completed").length;
  const currentBracketRound = Math.max(
    ...matches
      .filter(
        (m) => m.bracketSide !== "losers" && m.bracketSide !== "grand_final",
      )
      .map((m) => m.round),
  );
  const swissRoundsNeeded = Math.ceil(Math.log2(Math.max(participantCount, 2)));
  const isFinalSwissRound =
    isSwiss && Math.max(...matches.map((m) => m.round)) >= swissRoundsNeeded;

  return (
    <Card.Footer
      position="sticky"
      bottom={4}
      bg="bg.panel"
      borderTopWidth="1px"
      borderColor="border"
      py={3}
      px={4}
      boxShadow="0 -4px 6px -1px rgba(0, 0, 0, 0.1)"
      zIndex={10}
    >
      <Flex justifyContent="space-between" alignItems="center" w="full">
        <HStack gap={2}>
          <Text fontSize="sm" color="fg.muted">
            {isRoundRobin
              ? `${completedCount} / ${matches.length} matches`
              : `Round ${currentBracketRound} of ${roundNumbers.length}`}
          </Text>
          <Badge colorPalette="ink" variant="subtle" size="sm">
            {completedCount}/ {matches.length} matches done
          </Badge>
        </HStack>
        <Button
          colorPalette="brass"
          size="sm"
          onClick={onAdvanceRound}
          loading={actionLoading}
        >
          <LuChevronsRight />
          {isRoundRobin || isFinalSwissRound
            ? "Finalize Tournament"
            : "Advance Round"}
        </Button>
      </Flex>
    </Card.Footer>
  );
};

export default AdvanceRoundFooter;
