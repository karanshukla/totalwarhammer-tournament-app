import React, { useEffect } from "react";
import { displayName as dn } from "@/shared/utils/displayName";
import { matchStatusSurfaceMap } from "@/shared/tournament/types";
import {
  Box,
  HStack,
  VStack,
  Text,
  Badge,
  Button,
  Input,
  Popover,
  Separator,
} from "@chakra-ui/react";
import {
  LuCircleCheck,
  LuClock,
  LuSwords,
  LuShieldAlert,
  LuTrophy,
  LuTriangleAlert,
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
      key={m._id}
      p={4}
      borderRadius="md"
      borderWidth={1}
      borderColor={matchStatusSurfaceMap[m.status].borderColor}
      bg={matchStatusSurfaceMap[m.status].bg}
    >
      {/* Match status row */}
      <HStack mb={2} justifyContent="space-between">
        <Text fontSize="xs" color="fg.muted">
          Match {m.matchNumber}
        </Text>
        <HStack gap={1}>
          {m.resultOverrides.length > 0 && (
            <Popover.Root>
              <Popover.Trigger asChild>
                <Button
                  size="xs"
                  variant="ghost"
                  color="gold.text"
                  _hover={{ bg: "gold.subtle" }}
                  px={1}
                  minW="auto"
                  height="auto"
                  py="1px"
                >
                  <LuTriangleAlert />
                  {m.resultOverrides.length > 1
                    ? `${m.resultOverrides.length}× `
                    : ""}
                  Overridden
                </Button>
              </Popover.Trigger>
              <Popover.Positioner>
                <Popover.Content maxW="300px">
                  <Popover.Arrow>
                    <Popover.ArrowTip />
                  </Popover.Arrow>
                  <Popover.Body p={3}>
                    <VStack gap={2} alignItems="stretch">
                      <Text
                        fontSize="xs"
                        fontWeight="bold"
                        fontFamily="cond"
                        color="fg.secondary"
                        textTransform="uppercase"
                        letterSpacing="wide"
                      >
                        Result Override History
                      </Text>
                      {m.resultOverrides.map((o, i) => {
                        const newWinnerName =
                          o.newWinnerId === m.player1.participantId
                            ? dn(m.player1.name)
                            : dn(m.player2.name);
                        return (
                          <Box key={i}>
                            {i > 0 && <Separator mb={2} />}
                            <Text fontSize="xs" color="fg.primary">
                              Winner set to{" "}
                              <Text as="span" fontWeight="bold">
                                {newWinnerName}
                              </Text>
                            </Text>
                            <Text
                              fontSize="xs"
                              color={o.reason ? "fg.muted" : "fg.muted"}
                              fontStyle={o.reason ? "italic" : "normal"}
                              mt="2px"
                            >
                              {o.reason
                                ? `"${o.reason}"`
                                : "No reason provided"}
                            </Text>
                            <Text fontSize="2xs" color="fg.muted" mt="2px">
                              {new Date(o.overriddenAt).toLocaleString()}
                            </Text>
                          </Box>
                        );
                      })}
                    </VStack>
                  </Popover.Body>
                </Popover.Content>
              </Popover.Positioner>
            </Popover.Root>
          )}
          {m.status === "completed" && (
            <Badge
              size="sm"
              variant="subtle"
              bg="status.win.subtle"
              color="status.win"
              borderColor="status.win.border"
              borderWidth="1px"
            >
              <LuCircleCheck /> Completed
            </Badge>
          )}
          {m.status === "disputed" && (
            <Badge colorPalette="crimson" size="sm" variant="solid">
              ⚠ Disputed
            </Badge>
          )}
          {m.status === "in_progress" && (
            <Badge colorPalette="verdigris" size="sm" variant="subtle">
              <LuClock /> In Progress
            </Badge>
          )}
          {m.status === "pending" && (
            <Badge colorPalette="ink" size="sm" variant="subtle">
              Pending
            </Badge>
          )}
        </HStack>
      </HStack>
      <HStack gap={4} justifyContent="space-between" wrap="wrap">
        <VStack alignItems="flex-start" gap={0} flex={1}>
          <HStack gap={1}>
            {p1Won && (
              <Badge
                size="sm"
                variant="subtle"
                bg="status.win.subtle"
                color="status.win"
                borderColor="status.win.border"
                borderWidth="1px"
                fontWeight="bold"
              >
                W
              </Badge>
            )}
            {m.winnerId && !p1Won && (
              <Badge
                size="sm"
                bg="status.loss.subtle"
                color="status.loss"
                borderColor="status.loss.border"
                borderWidth="1px"
                fontWeight="bold"
              >
                L
              </Badge>
            )}
            <Text
              fontWeight={p1Won ? "bold" : "medium"}
              color={m.winnerId && !p1Won ? "fg.muted" : undefined}
            >
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
              <Badge
                size="sm"
                variant="subtle"
                bg="status.win.subtle"
                color="status.win"
                borderColor="status.win.border"
                borderWidth="1px"
                fontWeight="bold"
              >
                W
              </Badge>
            )}
            {m.winnerId && !p2Won && m.player2.name !== "BYE" && (
              <Badge
                size="sm"
                bg="status.loss.subtle"
                color="status.loss"
                borderColor="status.loss.border"
                borderWidth="1px"
                fontWeight="bold"
              >
                L
              </Badge>
            )}
            <Text
              fontWeight={p2Won ? "bold" : "medium"}
              color={
                m.player2.name === "BYE"
                  ? "fg.muted"
                  : m.winnerId && !p2Won
                    ? "fg.muted"
                    : undefined
              }
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
            <Text fontSize="xs" color="status.loss" fontWeight="bold">
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
              colorPalette="crimson"
              variant="solid"
              onClick={() => onResolveDispute(m._id, m.player1.participantId)}
              loading={actionLoading}
            >
              {dn(m.player1.name)} wins
            </Button>
            <Button
              size="xs"
              colorPalette="crimson"
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
              <Text fontSize="xs" color="gold.text" fontWeight="medium">
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
                colorPalette="verdigris"
                variant="outline"
                onClick={() => onRecordResult(m._id, m.player1.participantId)}
                loading={actionLoading}
              >
                <LuSwords /> {dn(m.player1.name)} wins
              </Button>
              <Button
                size="xs"
                colorPalette="verdigris"
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
            colorPalette="ink"
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
                    ? "verdigris"
                    : "ink"
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
                    ? "verdigris"
                    : "ink"
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
        <Text fontSize="xs" color="gold.text" mt={2} textAlign="center">
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
          color="status.loss"
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
            <Box color="gold.text" display="inline-flex">
              <LuTrophy size={12} />
            </Box>
            <Text fontSize="xs" color="fg.muted" fontWeight="medium">
              Winner:{" "}
              <Text as="span" color="gold.text" fontWeight="bold">
                {m.winnerId === m.player1.participantId
                  ? dn(m.player1.name)
                  : dn(m.player2.name)}
              </Text>
            </Text>
          </HStack>
        </Box>
      )}

      {/* Override panel */}
      {isOverriding && (
        <Box mt={3} pt={3} borderTopWidth={1} borderColor="border">
          <VStack gap={2} alignItems="stretch">
            <Text fontSize="xs" color="fg.muted" fontWeight="bold">
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
                colorPalette="ink"
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
                colorPalette="ink"
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
            {m.resultOverrides.length > 0 && (
              <Text fontSize="xs" color="fg.muted">
                This match has been overridden{" "}
                {m.resultOverrides.length === 1
                  ? "once"
                  : `${m.resultOverrides.length} times`}{" "}
                — see the{" "}
                <Text as="span" color="gold.text" fontStyle="italic">
                  Overridden
                </Text>{" "}
                badge above for details.
              </Text>
            )}
          </VStack>
        </Box>
      )}
    </Box>
  );
};

export default MatchCard;
