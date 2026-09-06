import React from "react";
import {
  Badge,
  Card,
  Heading,
  HStack,
  Icon,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { LuSwords } from "react-icons/lu";
import { computeStandings } from "@/shared/tournament/outcome";
import { Match, Tournament } from "./types";
import StandingsTable from "./section/StandingsTable";
import DoubleEliminationBrackets from "./section/DoubleEliminationBrackets";
import RoundsList from "./section/RoundsList";
import AdvanceRoundFooter from "./section/AdvanceRoundFooter";
import { useMatchOverridePanel } from "./section/useMatchOverridePanel";
import type { MatchViewer } from "./section/resolveMatchViewerRole";

interface Props {
  matches: Match[];
  selected: Tournament;
  user: MatchViewer | null;
  isAdmin: boolean;
  isActive: boolean;
  actionLoading: boolean;
  matchLoading: boolean;
  onRecordResult: (matchId: string, winnerId: string) => void;
  onReportResult: (matchId: string, winnerId: string) => void;
  onOverrideResult: (
    matchId: string,
    winnerId: string,
    reason: string,
  ) => Promise<void>;
  onResolveDispute: (matchId: string, winnerId: string) => void;
  onAdvanceRound: () => void;
}

const MatchesSection: React.FC<Props> = ({
  matches,
  selected,
  user,
  isAdmin,
  isActive,
  actionLoading,
  matchLoading,
  onRecordResult,
  onReportResult,
  onOverrideResult,
  onResolveDispute,
  onAdvanceRound,
}) => {
  const override = useMatchOverridePanel(onOverrideResult);

  const tournamentType = selected.tournamentType;
  const isDoubleElim = tournamentType === "Double Elimination";
  const isRoundRobin = tournamentType === "Round Robin";
  const isSwiss = tournamentType === "Swiss System";
  const isRoundRobinOrSwiss = isRoundRobin || isSwiss;

  const roundNumbers = [...new Set(matches.map((m) => m.round))].sort(
    (a, b) => a - b,
  );
  const standings = isRoundRobinOrSwiss
    ? computeStandings(selected.participants, matches)
    : [];

  const gridProps = {
    viewer: user,
    isAdmin,
    isActive,
    actionLoading,
    overrideMatchId: override.overrideMatchId,
    overrideLoading: override.overrideLoading,
    overrideWinnerId: override.overrideWinnerId,
    overrideReason: override.overrideReason,
    onRecordResult,
    onReportResult,
    onResolveDispute,
    onStartOverride: override.startOverride,
    onCancelOverride: override.cancelOverride,
    onSetOverrideWinner: override.setOverrideWinnerId,
    onSetOverrideReason: override.setOverrideReason,
    onConfirmOverride: override.confirmOverride,
  };

  return (
    <Card.Root
      gridColumn={{ lg: "1 / -1" }}
      bg="bg.panel"
      borderColor="border"
      shadow="sm"
    >
      <Card.Header>
        <HStack justifyContent="space-between">
          <HStack gap={2}>
            <Icon as={LuSwords} boxSize={4} color="fg.muted" />
            <Heading size="md">Matches</Heading>
            {matches.length > 0 && !isDoubleElim && !isRoundRobinOrSwiss && (
              <Badge colorPalette="ink" variant="subtle">
                Round {Math.max(...matches.map((m) => m.round))} of{" "}
                {roundNumbers.length}
              </Badge>
            )}
            {isRoundRobin && (
              <Badge colorPalette="verdigris" variant="subtle">
                Round Robin
              </Badge>
            )}
            {isSwiss && (
              <Badge colorPalette="verdigris" variant="subtle">
                Swiss System
              </Badge>
            )}
            {isDoubleElim && (
              <Badge colorPalette="ink" variant="subtle">
                Double Elimination
              </Badge>
            )}
          </HStack>
          {matchLoading && (
            <Spinner size="sm" role="status" aria-label="Loading matches" />
          )}
        </HStack>
      </Card.Header>
      <Card.Body>
        {matches.length === 0 ? (
          <Text color="fg.muted" textAlign="center" py={4}>
            No Matches Generated Yet
          </Text>
        ) : (
          <VStack gap={6} alignItems="stretch">
            {isRoundRobinOrSwiss && standings.length > 0 && (
              <StandingsTable standings={standings} />
            )}

            {isDoubleElim && (
              <DoubleEliminationBrackets matches={matches} {...gridProps} />
            )}

            {!isDoubleElim && (
              <RoundsList
                matches={matches}
                roundNumbers={roundNumbers}
                isRoundRobinOrSwiss={isRoundRobinOrSwiss}
                {...gridProps}
              />
            )}
          </VStack>
        )}
      </Card.Body>
      {isAdmin && isActive && matches.length > 0 && (
        <AdvanceRoundFooter
          matches={matches}
          roundNumbers={roundNumbers}
          isRoundRobin={isRoundRobin}
          isSwiss={isSwiss}
          participantCount={selected.participants.length}
          actionLoading={actionLoading}
          onAdvanceRound={onAdvanceRound}
        />
      )}
    </Card.Root>
  );
};

export default MatchesSection;
