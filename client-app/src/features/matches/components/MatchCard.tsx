import React from "react";
import { displayName as dn } from "@/shared/utils/displayName";
import {
  Box,
  HStack,
  VStack,
  Text,
  Badge,
  Button,
  Input,
} from "@chakra-ui/react";
import {
  LuCircleCheck,
  LuClock,
  LuSwords,
  LuShieldAlert,
  LuTrophy,
} from "react-icons/lu";

interface MatchData {
  _id: string;
  round: number;
  matchNumber: number;
  player1: {
    participantId: string;
    name: string;
    faction: string;
    isBetaFaction?: boolean;
  };
  player2: {
    participantId: string;
    name: string;
    faction: string;
    isBetaFaction?: boolean;
  };
  winnerId: string | null;
  loserId: string | null;
  status: "pending" | "in_progress" | "completed" | "disputed";
  notes: string;
  reportedResults: {
    reportedBy: string;
    reportedByName: string;
    winnerId: string;
  }[];
  resultOverrides: {
    previousWinnerId: string | null;
    newWinnerId: string;
    overriddenBy: string;
    reason: string;
    overriddenAt: string;
  }[];
  completedAt: string | null;
  bracketSide: "winners" | "losers" | "grand_final" | null;
}

interface MatchCardProps {
  m: MatchData;
  p1Won: boolean;
  p2Won: boolean;
  isOverriding: boolean;
  isAdmin: boolean;
  isActive: boolean;
  myReport:
    | { reportedBy: string; reportedByName: string; winnerId: string }
    | undefined;
  canParticipantReport: boolean;
  isP1: boolean;
  isP2: boolean;
  actionLoading: boolean;
  overrideLoading: boolean;
  overrideWinnerId: string;
  overrideReason: string;
  borderColor: string;
  mutedBg: string;
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
  m,
  p1Won,
  p2Won,
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
  borderColor,
  mutedBg,
  onRecordResult,
  onReportResult,
  onResolveDispute,
  onStartOverride,
  onCancelOverride,
  onSetOverrideWinner,
  onSetOverrideReason,
  onConfirmOverride,
}) => {
  return (
    <Box
      key={m._id}
      p={4}
      borderRadius="md"
      borderWidth={1}
      borderColor={
        m.status === "disputed"
          ? "orange.emphasized"
          : m.status === "completed"
            ? "green.muted"
            : borderColor
      }
      bg={
        m.status === "disputed"
          ? "orange.subtle"
          : m.status === "completed"
            ? "green.subtle"
            : mutedBg
      }
    >
      {/* Match status row */}
      <HStack mb={2} justifyContent="space-between">
        <Text fontSize="xs" color="fg.subtle">
          Match {m.matchNumber}
        </Text>
        {m.status === "completed" && (
          <Badge colorPalette="green" size="sm" variant="subtle">
            <LuCircleCheck /> Completed
          </Badge>
        )}
        {m.status === "disputed" && (
          <Badge colorPalette="orange" size="sm" variant="solid">
            ⚠ Disputed
          </Badge>
        )}
        {m.status === "in_progress" && (
          <Badge colorPalette="blue" size="sm" variant="subtle">
            <LuClock /> In Progress
          </Badge>
        )}
        {m.status === "pending" && (
          <Badge colorPalette="gray" size="sm" variant="subtle">
            Pending
          </Badge>
        )}
      </HStack>
      <HStack gap={4} justifyContent="space-between" wrap="wrap">
        <VStack alignItems="flex-start" gap={0} flex={1}>
          <HStack gap={1}>
            {p1Won && (
              <Badge colorPalette="green" size="sm">
                W
              </Badge>
            )}
            {m.winnerId && !p1Won && (
              <Badge colorPalette="red" size="sm">
                L
              </Badge>
            )}
            <Text fontWeight={p1Won ? "bold" : "medium"}>
              {dn(m.player1.name)}
            </Text>
          </HStack>
          {m.player1.faction && (
            <Text fontSize="xs" color="fg.muted">
              {m.player1.faction}
            </Text>
          )}
        </VStack>
        <VStack gap={0}>
          <Text color="fg.muted" fontWeight="bold" fontSize="sm">
            vs
          </Text>
        </VStack>
        <VStack alignItems="flex-end" gap={0} flex={1}>
          <HStack gap={1}>
            {p2Won && (
              <Badge colorPalette="green" size="sm">
                W
              </Badge>
            )}
            {m.winnerId && !p2Won && m.player2.name !== "BYE" && (
              <Badge colorPalette="red" size="sm">
                L
              </Badge>
            )}
            <Text
              fontWeight={p2Won ? "bold" : "medium"}
              color={m.player2.name === "BYE" ? "fg.subtle" : undefined}
              fontStyle={m.player2.name === "BYE" ? "italic" : undefined}
            >
              {dn(m.player2.name)}
            </Text>
          </HStack>
          {m.player2.faction && m.player2.name !== "BYE" && (
            <Text fontSize="xs" color="fg.muted" textAlign="right">
              {m.player2.faction}
            </Text>
          )}
        </VStack>
        {isAdmin && isActive && m.status === "disputed" && (
          <VStack gap={2} flexShrink={0} alignItems="flex-start">
            <Text fontSize="xs" color="orange.fg" fontWeight="bold">
              ⚠ Disputed - resolve:
            </Text>
            {(m.reportedResults ?? []).map((r) => {
              const rBy = r.reportedBy?.toString();
              const reporterName =
                rBy === m.player1.participantId?.toString()
                  ? m.player1.name
                  : rBy === m.player2.participantId?.toString()
                    ? dn(m.player2.name)
                    : r.reportedByName;
              const votedForName =
                r.winnerId?.toString() === m.player1.participantId?.toString()
                  ? dn(m.player1.name)
                  : dn(m.player2.name);
              return (
                <Text key={r.reportedBy} fontSize="xs" color="fg.muted">
                  <strong>{dn(reporterName)}</strong> says{" "}
                  <strong>{dn(votedForName)}</strong> won
                </Text>
              );
            })}
            <Button
              size="xs"
              colorPalette="orange"
              variant="solid"
              onClick={() => onResolveDispute(m._id, m.player1.participantId)}
              loading={actionLoading}
            >
              {dn(m.player1.name)} wins
            </Button>
            <Button
              size="xs"
              colorPalette="orange"
              variant="solid"
              onClick={() => onResolveDispute(m._id, m.player2.participantId)}
              loading={actionLoading}
            >
              {dn(m.player2.name)} wins
            </Button>
          </VStack>
        )}
        {/* Admin view of reported results for in-progress matches */}
        {isAdmin &&
          isActive &&
          m.status === "in_progress" &&
          (m.reportedResults?.length ?? 0) > 0 && (
            <VStack gap={1} flexShrink={0} alignItems="flex-start">
              <Text fontSize="xs" color="blue.fg" fontWeight="medium">
                Reported results ({m.reportedResults?.length}/2):
              </Text>
              {(m.reportedResults ?? []).map((r) => {
                const rBy = r.reportedBy?.toString();
                const reporterName =
                  rBy === m.player1.participantId?.toString()
                    ? dn(m.player1.name)
                    : rBy === m.player2.participantId?.toString()
                      ? dn(m.player2.name)
                      : r.reportedByName;
                const votedForName =
                  r.winnerId?.toString() === m.player1.participantId?.toString()
                    ? dn(m.player1.name)
                    : dn(m.player2.name);
                return (
                  <Text key={r.reportedBy} fontSize="xs" color="fg.muted">
                    <strong>{dn(reporterName)}</strong> says{" "}
                    <strong>{dn(votedForName)}</strong> won
                  </Text>
                );
              })}
            </VStack>
          )}
        {isAdmin &&
          !isP1 &&
          !isP2 &&
          isActive &&
          m.status !== "completed" &&
          m.status !== "disputed" &&
          m.player2.name !== "BYE" && (
            <VStack gap={1} flexShrink={0}>
              <Text fontSize="xs" color="fg.muted" fontWeight="medium">
                Record result:
              </Text>
              <Button
                size="xs"
                colorPalette="green"
                variant="outline"
                onClick={() => onRecordResult(m._id, m.player1.participantId)}
                loading={actionLoading}
              >
                <LuSwords /> {dn(m.player1.name)} wins
              </Button>
              <Button
                size="xs"
                colorPalette="green"
                variant="outline"
                onClick={() => onRecordResult(m._id, m.player2.participantId)}
                loading={actionLoading}
              >
                <LuSwords /> {dn(m.player2.name)} wins
              </Button>
            </VStack>
          )}
        {isAdmin && isActive && m.player2.name !== "BYE" && (
          <Button
            size="xs"
            colorPalette="orange"
            variant="outline"
            onClick={onStartOverride}
          >
            <LuShieldAlert /> Override
          </Button>
        )}
      </HStack>

      {/* Participant report buttons */}
      {canParticipantReport && (
        <Box mt={3} pt={3} borderTopWidth={1} borderColor="border">
          <VStack gap={3} alignItems="stretch">
            <Text
              fontSize="sm"
              color="fg.muted"
              fontWeight="semibold"
              textAlign="center"
            >
              {myReport
                ? "Change your reported winner:"
                : "Who won this match?"}
            </Text>
            <VStack gap={2} alignItems="stretch">
              <Button
                size="lg"
                width="full"
                colorPalette={
                  myReport?.winnerId === m.player1.participantId
                    ? "green"
                    : "gray"
                }
                variant={
                  myReport?.winnerId === m.player1.participantId
                    ? "solid"
                    : "outline"
                }
                onClick={() => onReportResult(m._id, m.player1.participantId)}
                loading={actionLoading}
                fontWeight="bold"
              >
                {myReport?.winnerId === m.player1.participantId && <LuTrophy />}
                {dn(m.player1.name)} won
              </Button>
              <Button
                size="lg"
                width="full"
                colorPalette={
                  myReport?.winnerId === m.player2.participantId
                    ? "green"
                    : "gray"
                }
                variant={
                  myReport?.winnerId === m.player2.participantId
                    ? "solid"
                    : "outline"
                }
                onClick={() => onReportResult(m._id, m.player2.participantId)}
                loading={actionLoading}
                fontWeight="bold"
              >
                {myReport?.winnerId === m.player2.participantId && <LuTrophy />}
                {dn(m.player2.name)} won
              </Button>
            </VStack>
          </VStack>
        </Box>
      )}
      {!isAdmin && (isP1 || isP2) && m.status === "in_progress" && myReport && (
        <Text fontSize="xs" color="blue.fg" mt={2} textAlign="center">
          You reported{" "}
          <strong>
            {myReport.winnerId === m.player1.participantId
              ? dn(m.player1.name)
              : dn(m.player2.name)}
          </strong>{" "}
          as winner - waiting for opponent
        </Text>
      )}
      {!isAdmin && (isP1 || isP2) && m.status === "disputed" && (
        <Text
          fontSize="xs"
          color="orange.fg"
          mt={2}
          textAlign="center"
          fontWeight="medium"
        >
          Result disputed - awaiting organiser decision
        </Text>
      )}

      {m.winnerId && (
        <Box mt={2} pt={2} borderTopWidth={1} borderColor="border">
          <HStack gap={1} justifyContent="center">
            <LuTrophy size={12} />
            <Text fontSize="xs" color="fg.muted" fontWeight="medium">
              Winner:{" "}
              <strong>
                {m.winnerId === m.player1.participantId
                  ? dn(m.player1.name)
                  : dn(m.player2.name)}
              </strong>
            </Text>
          </HStack>
        </Box>
      )}

      {/* Override panel */}
      {isOverriding && (
        <Box mt={3} pt={3} borderTopWidth={1} borderColor="border">
          <VStack gap={2} alignItems="stretch">
            <Text fontSize="xs" color="orange.fg" fontWeight="bold">
              Override result
            </Text>
            <HStack gap={2}>
              <Button
                size="xs"
                flex={1}
                variant={
                  overrideWinnerId === m.player1.participantId
                    ? "solid"
                    : "outline"
                }
                colorPalette="blue"
                onClick={() => onSetOverrideWinner(m.player1.participantId)}
              >
                {dn(m.player1.name)}
              </Button>
              <Button
                size="xs"
                flex={1}
                variant={
                  overrideWinnerId === m.player2.participantId
                    ? "solid"
                    : "outline"
                }
                colorPalette="blue"
                onClick={() => onSetOverrideWinner(m.player2.participantId)}
              >
                {dn(m.player2.name)}
              </Button>
            </HStack>
            <Input
              size="sm"
              placeholder="Reason (optional)"
              value={overrideReason}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onSetOverrideReason(e.target.value)
              }
            />
            <HStack gap={2}>
              <Button
                size="xs"
                colorPalette="orange"
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
            {m.resultOverrides.length > 0 && (
              <Text fontSize="xs" color="fg.muted">
                {m.resultOverrides.length} previous override(s)
              </Text>
            )}
          </VStack>
        </Box>
      )}
    </Box>
  );
};

export default MatchCard;
