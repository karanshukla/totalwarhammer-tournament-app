import React, { useEffect } from "react";
import { displayName as dn } from "@/shared/utils/displayName";
import type { Match } from "@/shared/tournament/types";
import { matchStatusSurfaceMap } from "@/shared/tournament/types";
import { MatchStatusBadge } from "@/shared/ui/MatchBadges";
import { MatchupRow, MatchWinnerLine } from "@/shared/ui/MatchupRow";
import {
  Box,
  HStack,
  VStack,
  Text,
  Button,
  Input,
  Popover,
  SimpleGrid,
  Separator,
} from "@chakra-ui/react";
import {
  LuSwords,
  LuShieldAlert,
  LuTrophy,
  LuTriangleAlert,
} from "react-icons/lu";

interface MatchCardProps {
  m: Match;
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

/** The two winner choices, laid out identically wherever a result is entered. */
const WinnerChoices: React.FC<{
  m: Match;
  label: (name: string) => string;
  loading: boolean;
  size?: "xs" | "sm" | "md";
  paletteFor: (participantId: string) => string;
  variantFor: (participantId: string) => "solid" | "outline";
  iconFor?: (participantId: string) => React.ReactNode;
  onChoose: (participantId: string) => void;
}> = ({
  m,
  label,
  loading,
  size = "sm",
  paletteFor,
  variantFor,
  iconFor,
  onChoose,
}) => (
  <SimpleGrid columns={{ base: 1, sm: 2 }} gap={2}>
    {[m.player1, m.player2].map((player) => (
      <Button
        key={player.participantId}
        size={size}
        width="full"
        colorPalette={paletteFor(player.participantId)}
        variant={variantFor(player.participantId)}
        onClick={() => onChoose(player.participantId)}
        loading={loading}
        fontWeight="bold"
      >
        {iconFor?.(player.participantId)}
        {label(dn(player.name))}
      </Button>
    ))}
  </SimpleGrid>
);

const ReportedResultLines: React.FC<{ m: Match }> = ({ m }) => (
  <>
    {(m.reportedResults ?? []).map((r) => {
      const reportedBy = r.reportedBy?.toString();
      const reporterName =
        reportedBy === m.player1.participantId?.toString()
          ? m.player1.name
          : reportedBy === m.player2.participantId?.toString()
            ? m.player2.name
            : r.reportedByName;
      const votedForName =
        r.winnerId?.toString() === m.player1.participantId?.toString()
          ? dn(m.player1.name)
          : dn(m.player2.name);
      return (
        <Text key={r.reportedBy} fontSize="xs" color="fg.muted">
          <strong>{dn(reporterName)}</strong> says{" "}
          <strong>{votedForName}</strong> won
        </Text>
      );
    })}
  </>
);

/** Section beneath the matchup that holds every control for this match. */
const ActionZone: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <VStack
    mt={3}
    pt={3}
    gap={3}
    alignItems="stretch"
    borderTopWidth={1}
    borderColor="border"
  >
    {children}
  </VStack>
);

const ActionLabel: React.FC<{ children: React.ReactNode; tone?: string }> = ({
  children,
  tone = "fg.muted",
}) => (
  <Text
    fontSize="xs"
    fontFamily="cond"
    fontWeight="semibold"
    textTransform="uppercase"
    letterSpacing="wide"
    color={tone}
  >
    {children}
  </Text>
);

const MatchCard: React.FC<MatchCardProps> = ({
  m,
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

  const isBye = m.player2.name === "BYE";
  const canResolveDispute = isAdmin && isActive && m.status === "disputed";
  const canRecordResult =
    isAdmin &&
    !isP1 &&
    !isP2 &&
    isActive &&
    m.status !== "completed" &&
    m.status !== "disputed" &&
    !isBye;
  const showsReportedResults =
    isAdmin &&
    isActive &&
    m.status === "in_progress" &&
    (m.reportedResults?.length ?? 0) > 0;
  const canOverride = isAdmin && isActive && !isBye;
  const hasActions =
    canResolveDispute ||
    canRecordResult ||
    showsReportedResults ||
    canParticipantReport ||
    canOverride ||
    isOverriding;

  return (
    <Box
      p={4}
      borderRadius="md"
      borderWidth={1}
      borderColor={matchStatusSurfaceMap[m.status].borderColor}
      bg={matchStatusSurfaceMap[m.status].bg}
      display="flex"
      flexDirection="column"
    >
      <HStack mb={3} justifyContent="space-between">
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
                              color="fg.muted"
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
          <MatchStatusBadge status={m.status} withIcon />
        </HStack>
      </HStack>

      <MatchupRow match={m} />

      <MatchWinnerLine match={m} />

      {!isAdmin && (isP1 || isP2) && m.status === "in_progress" && myReport && (
        <Text fontSize="xs" color="gold.text" mt={3} textAlign="center">
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
          mt={3}
          textAlign="center"
          fontWeight="medium"
        >
          Result disputed - awaiting organiser decision
        </Text>
      )}

      {hasActions && (
        <ActionZone>
          {canParticipantReport && (
            <VStack gap={2} alignItems="stretch">
              <ActionLabel>
                {myReport
                  ? "Change your reported winner:"
                  : "Who won this match?"}
              </ActionLabel>
              <WinnerChoices
                m={m}
                label={(name) => `${name} won`}
                loading={actionLoading}
                size="md"
                paletteFor={(id) =>
                  myReport?.winnerId === id ? "verdigris" : "ink"
                }
                variantFor={(id) =>
                  myReport?.winnerId === id ? "solid" : "outline"
                }
                iconFor={(id) =>
                  myReport?.winnerId === id ? <LuTrophy /> : null
                }
                onChoose={(id) => onReportResult(m._id, id)}
              />
            </VStack>
          )}

          {showsReportedResults && (
            <VStack gap={1} alignItems="flex-start">
              <ActionLabel tone="gold.text">
                Reported results ({m.reportedResults?.length}/2):
              </ActionLabel>
              <ReportedResultLines m={m} />
            </VStack>
          )}

          {canResolveDispute && (
            <VStack gap={2} alignItems="stretch">
              <ActionLabel tone="status.loss">
                ⚠ Disputed - resolve:
              </ActionLabel>
              <ReportedResultLines m={m} />
              <WinnerChoices
                m={m}
                label={(name) => `${name} wins`}
                loading={actionLoading}
                paletteFor={() => "crimson"}
                variantFor={() => "outline"}
                onChoose={(id) => onResolveDispute(m._id, id)}
              />
            </VStack>
          )}

          {canRecordResult && (
            <VStack gap={2} alignItems="stretch">
              <ActionLabel>Record result:</ActionLabel>
              <WinnerChoices
                m={m}
                label={(name) => `${name} wins`}
                loading={actionLoading}
                paletteFor={() => "verdigris"}
                variantFor={() => "outline"}
                iconFor={() => <LuSwords />}
                onChoose={(id) => onRecordResult(m._id, id)}
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
                m={m}
                label={(name) => name}
                loading={false}
                size="xs"
                paletteFor={() => "ink"}
                variantFor={(id) =>
                  overrideWinnerId === id ? "solid" : "outline"
                }
                onChoose={onSetOverrideWinner}
              />
              <Input
                size="sm"
                aria-label="Reason for overriding the result"
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
          )}
        </ActionZone>
      )}
    </Box>
  );
};

export default MatchCard;
