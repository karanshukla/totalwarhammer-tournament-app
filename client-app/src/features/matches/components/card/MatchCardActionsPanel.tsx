import React from "react";
import { Input, Button, HStack, Text, VStack } from "@chakra-ui/react";
import { LuSwords, LuShieldAlert, LuTrophy } from "react-icons/lu";
import type { Match, ReportedResult } from "@/shared/tournament/types";
import { OVERRIDE_REASON_MAX_LENGTH } from "@/shared/constants/validation";
import { ActionZone, ActionLabel } from "./ActionLayout";
import WinnerChoices from "./WinnerChoices";
import ReportedResultLines from "./ReportedResultLines";

interface MatchCardActionsPanelProps {
  match: Match;
  isAdmin: boolean;
  isActive: boolean;
  isP1: boolean;
  isP2: boolean;
  myReport: ReportedResult | undefined;
  canParticipantReport: boolean;
  isOverriding: boolean;
  actionLoading: boolean;
  overrideLoading: boolean;
  overrideWinnerId: string;
  overrideReason: string;
  onReportResult: (matchId: string, winnerId: string) => void;
  onResolveDispute: (matchId: string, winnerId: string) => void;
  onRecordResult: (matchId: string, winnerId: string) => void;
  onStartOverride: () => void;
  onCancelOverride: () => void;
  onSetOverrideWinner: (id: string) => void;
  onSetOverrideReason: (reason: string) => void;
  onConfirmOverride: () => void;
}

const MatchCardActionsPanel: React.FC<MatchCardActionsPanelProps> = ({
  match,
  isAdmin,
  isActive,
  isP1,
  isP2,
  myReport,
  canParticipantReport,
  isOverriding,
  actionLoading,
  overrideLoading,
  overrideWinnerId,
  overrideReason,
  onReportResult,
  onResolveDispute,
  onRecordResult,
  onStartOverride,
  onCancelOverride,
  onSetOverrideWinner,
  onSetOverrideReason,
  onConfirmOverride,
}) => {
  const isBye = match.player2.name === "BYE";
  const canResolveDispute = isAdmin && isActive && match.status === "disputed";
  const canRecordResult =
    isAdmin &&
    !isP1 &&
    !isP2 &&
    isActive &&
    match.status !== "completed" &&
    match.status !== "disputed" &&
    !isBye;
  const showsReportedResults =
    isAdmin &&
    isActive &&
    match.status === "in_progress" &&
    (match.reportedResults?.length ?? 0) > 0;
  const canOverride = isAdmin && isActive && !isBye;
  const hasActions =
    canResolveDispute ||
    canRecordResult ||
    showsReportedResults ||
    canParticipantReport ||
    canOverride ||
    isOverriding;

  if (!hasActions) return null;

  return (
    <ActionZone>
      {canParticipantReport && (
        <VStack gap={2} alignItems="stretch">
          <ActionLabel>
            {myReport ? "Change your reported winner:" : "Who won this match?"}
          </ActionLabel>
          <WinnerChoices
            match={match}
            label={(name) => `${name} won`}
            loading={actionLoading}
            size="md"
            paletteFor={(id) =>
              myReport?.winnerId === id ? "verdigris" : "ink"
            }
            variantFor={(id) =>
              myReport?.winnerId === id ? "solid" : "outline"
            }
            iconFor={(id) => (myReport?.winnerId === id ? <LuTrophy /> : null)}
            onChoose={(id) => onReportResult(match._id, id)}
          />
        </VStack>
      )}

      {showsReportedResults && (
        <VStack gap={1} alignItems="flex-start">
          <ActionLabel tone="gold.text">
            Reported results ({match.reportedResults?.length}/2):
          </ActionLabel>
          <ReportedResultLines match={match} />
        </VStack>
      )}

      {canResolveDispute && (
        <VStack gap={2} alignItems="stretch">
          <ActionLabel tone="status.loss">⚠ Disputed - resolve:</ActionLabel>
          <ReportedResultLines match={match} />
          <WinnerChoices
            match={match}
            label={(name) => `${name} wins`}
            loading={actionLoading}
            paletteFor={() => "crimson"}
            variantFor={() => "outline"}
            onChoose={(id) => onResolveDispute(match._id, id)}
          />
        </VStack>
      )}

      {canRecordResult && (
        <VStack gap={2} alignItems="stretch">
          <ActionLabel>Record result:</ActionLabel>
          <WinnerChoices
            match={match}
            label={(name) => `${name} wins`}
            loading={actionLoading}
            paletteFor={() => "verdigris"}
            variantFor={() => "outline"}
            iconFor={() => <LuSwords />}
            onChoose={(id) => onRecordResult(match._id, id)}
          />
        </VStack>
      )}

      {canOverride && !isOverriding && (
        <Button
          size="xs"
          colorPalette="ink"
          variant="outline"
          alignSelf="flex-end"
          onClick={onStartOverride}
        >
          <LuShieldAlert /> Override
        </Button>
      )}

      {isOverriding && (
        <VStack gap={2} alignItems="stretch">
          <ActionLabel>Override result</ActionLabel>
          <WinnerChoices
            match={match}
            label={(name) => name}
            loading={false}
            size="xs"
            paletteFor={() => "ink"}
            variantFor={(id) => (overrideWinnerId === id ? "solid" : "outline")}
            onChoose={onSetOverrideWinner}
          />
          <Input
            size="sm"
            aria-label="Reason for overriding the result"
            placeholder="Reason (optional)"
            value={overrideReason}
            maxLength={OVERRIDE_REASON_MAX_LENGTH}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onSetOverrideReason(e.target.value)
            }
          />
          <HStack gap={2}>
            <Button
              size="xs"
              colorPalette="crimson"
              onClick={onConfirmOverride}
              loading={overrideLoading}
              disabled={!overrideWinnerId}
            >
              Confirm Override
            </Button>
            <Button size="xs" variant="ghost" onClick={onCancelOverride}>
              Cancel
            </Button>
          </HStack>
          {match.resultOverrides.length > 0 && (
            <Text fontSize="xs" color="fg.muted">
              This match has been overridden{" "}
              {match.resultOverrides.length === 1
                ? "once"
                : `${match.resultOverrides.length} times`}{" "}
              — see the{" "}
              <Text as="span" color="gold.text" fontStyle="italic">
                Overridden
              </Text>{" "}
              badge above for details.
            </Text>
          )}
        </VStack>
      )}
    </ActionZone>
  );
};

export default MatchCardActionsPanel;
