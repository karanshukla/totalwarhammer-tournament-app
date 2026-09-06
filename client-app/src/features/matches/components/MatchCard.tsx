import React, { useEffect } from "react";
import { displayName as dn } from "@/shared/utils/displayName";
import type { Match, ReportedResult } from "@/shared/tournament/types";
import { matchStatusSurfaceMap } from "@/shared/tournament/types";
import { MatchStatusBadge } from "@/shared/ui/MatchBadges";
import { MatchupRow, MatchWinnerLine } from "@/shared/ui/MatchupRow";
import { Box, HStack, Text } from "@chakra-ui/react";
import OverrideHistoryPopover from "./card/OverrideHistoryPopover";
import MatchCardActionsPanel from "./card/MatchCardActionsPanel";

interface MatchCardProps {
  match: Match;
  isOverriding: boolean;
  isAdmin: boolean;
  isActive: boolean;
  myReport: ReportedResult | undefined;
  canParticipantReport: boolean;
  isP1: boolean;
  isP2: boolean;
  actionLoading: boolean;
  overrideLoading: boolean;
  overrideWinnerId: string;
  overrideReason: string;
  onRecordResult: (matchId: string, winnerId: string) => void;
  onReportResult: (matchId: string, winnerId: string) => void;
  onResolveDispute: (matchId: string, winnerId: string) => void;
  onStartOverride: () => void;
  onCancelOverride: () => void;
  onSetOverrideWinner: (id: string) => void;
  onSetOverrideReason: (reason: string) => void;
  onConfirmOverride: () => void;
}

const MatchCard: React.FC<MatchCardProps> = ({
  match,
  isOverriding,
  isAdmin,
  isActive,
  myReport,
  canParticipantReport,
  isP1,
  isP2,
  actionLoading,
  overrideLoading,
  overrideWinnerId,
  overrideReason,
  onRecordResult,
  onReportResult,
  onResolveDispute,
  onStartOverride,
  onCancelOverride,
  onSetOverrideWinner,
  onSetOverrideReason,
  onConfirmOverride,
}) => {
  // Esc cancels the inline result-override panel (issue #144). The listener is
  // scoped to when the panel is open so it never swallows Esc elsewhere.
  useEffect(() => {
    if (!isOverriding) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancelOverride();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOverriding, onCancelOverride]);

  return (
    <Box
      p={4}
      borderRadius="md"
      borderWidth={1}
      borderColor={matchStatusSurfaceMap[match.status].borderColor}
      bg={matchStatusSurfaceMap[match.status].bg}
      display="flex"
      flexDirection="column"
    >
      <HStack mb={3} justifyContent="space-between">
        <Text fontSize="xs" color="fg.muted">
          Match {match.matchNumber}
        </Text>
        <HStack gap={1}>
          {match.resultOverrides.length > 0 && (
            <OverrideHistoryPopover match={match} />
          )}
          <MatchStatusBadge status={match.status} withIcon />
        </HStack>
      </HStack>

      <MatchupRow match={match} />

      <MatchWinnerLine match={match} />

      {!isAdmin &&
        (isP1 || isP2) &&
        match.status === "in_progress" &&
        myReport && (
          <Text fontSize="xs" color="gold.text" mt={3} textAlign="center">
            You reported{" "}
            <strong>
              {myReport.winnerId === match.player1.participantId
                ? dn(match.player1.name)
                : dn(match.player2.name)}
            </strong>{" "}
            as winner - waiting for opponent
          </Text>
        )}
      {!isAdmin && (isP1 || isP2) && match.status === "disputed" && (
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

      <MatchCardActionsPanel
        match={match}
        isAdmin={isAdmin}
        isActive={isActive}
        isP1={isP1}
        isP2={isP2}
        myReport={myReport}
        canParticipantReport={canParticipantReport}
        isOverriding={isOverriding}
        actionLoading={actionLoading}
        overrideLoading={overrideLoading}
        overrideWinnerId={overrideWinnerId}
        overrideReason={overrideReason}
        onReportResult={onReportResult}
        onResolveDispute={onResolveDispute}
        onRecordResult={onRecordResult}
        onStartOverride={onStartOverride}
        onCancelOverride={onCancelOverride}
        onSetOverrideWinner={onSetOverrideWinner}
        onSetOverrideReason={onSetOverrideReason}
        onConfirmOverride={onConfirmOverride}
      />
    </Box>
  );
};

export default MatchCard;
