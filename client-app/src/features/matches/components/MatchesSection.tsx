import React, { useState } from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Card,
  SimpleGrid,
  Spinner,
  Separator,
  For,
  Flex,
  Table,
  Button,
} from "@chakra-ui/react";
import { LuSwords, LuTrophy, LuChevronsRight } from "react-icons/lu";
import MatchCard from "./MatchCard";
import { Match, Tournament } from "./types";

interface Props {
  matches: Match[];
  selected: Tournament;
  user: { id: string; username?: string; isGuest?: boolean } | null;
  isAdmin: boolean;
  isActive: boolean;
  actionLoading: boolean;
  matchLoading: boolean;
  onRecordResult: (matchId: string, winnerId: string) => void;
  onReportResult: (matchId: string, winnerId: string) => void;
  onOverrideResult: (matchId: string, winnerId: string, reason: string) => Promise<void>;
  onResolveDispute: (matchId: string, winnerId: string) => void;
  onAdvanceRound: () => void;
}

function resolveMatchUser(m: Match, user: Props["user"], isAdmin: boolean, isActive: boolean) {
  const uName = user?.username?.trim().toLowerCase();
  const uId = user?.id;
  const guestFallback = user?.isGuest && uId ? `guest_${uId.substring(0, 6)}` : null;
  const nameMatch = (n: string) => {
    const ln = n.trim().toLowerCase();
    return (uName && ln === uName) || (guestFallback && ln === guestFallback);
  };
  const isP1 = m.player1.participantId === uId || !!nameMatch(m.player1.name) || m.player1.name === uId;
  const isP2 = m.player2.participantId === uId || !!nameMatch(m.player2.name) || m.player2.name === uId;
  const myReport = m.reportedResults?.find(
    (r) => r.reportedBy === (isP1 ? m.player1.participantId : m.player2.participantId) || r.reportedByName === uName,
  );
  const canPR = !isAdmin && (isP1 || isP2) && isActive && m.status !== "completed" && m.status !== "disputed";
  return { isP1, isP2, myReport, canPR };
}

const cardBg = "bg.panel";
const mutedBg = "bg.subtle";
const borderColor = "border";

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
  const [overrideMatchId, setOverrideMatchId] = useState<string | null>(null);
  const [overrideWinnerId, setOverrideWinnerId] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideLoading, setOverrideLoading] = useState(false);

  const handleOverrideConfirm = async () => {
    if (!overrideMatchId || !overrideWinnerId) return;
    setOverrideLoading(true);
    try {
      await onOverrideResult(overrideMatchId, overrideWinnerId, overrideReason);
      setOverrideMatchId(null);
      setOverrideWinnerId("");
      setOverrideReason("");
    } finally {
      setOverrideLoading(false);
    }
  };

  const tournamentType = selected.tournamentType;
  const isDoubleElim = tournamentType === "Double Elimination";
  const isRoundRobin = tournamentType === "Round Robin";
  const isSwiss = tournamentType === "Swiss System";
  const isRROrSwiss = isRoundRobin || isSwiss;

  const roundNumbers = [...new Set(matches.map((m) => m.round))].sort((a, b) => a - b);

  const standings = isRROrSwiss
    ? (() => {
        const map = new Map<
          string,
          { name: string; faction: string; wins: number; losses: number; played: number }
        >();
        for (const p of selected.participants) {
          map.set(p._id, { name: p.name, faction: p.faction, wins: 0, losses: 0, played: 0 });
        }
        for (const m of matches) {
          if (m.status !== "completed" || !m.winnerId || m.player2.name === "BYE") continue;
          const wId = m.winnerId;
          const lId = wId === m.player1.participantId ? m.player2.participantId : m.player1.participantId;
          if (map.has(wId)) {
            const e = map.get(wId)!;
            e.wins++;
            e.played++;
          }
          if (lId && map.has(lId)) {
            const e = map.get(lId)!;
            e.losses++;
            e.played++;
          }
        }
        return [...map.values()].sort((a, b) => b.wins - a.wins || a.losses - b.losses);
      })()
    : [];

  const wbMatches = isDoubleElim ? matches.filter((m) => m.bracketSide === "winners") : [];
  const lbMatches = isDoubleElim ? matches.filter((m) => m.bracketSide === "losers") : [];
  const gfMatches = isDoubleElim ? matches.filter((m) => m.bracketSide === "grand_final") : [];
  const wbRounds = [...new Set(wbMatches.map((m) => m.round))].sort((a, b) => a - b);
  const lbRounds = [...new Set(lbMatches.map((m) => m.round))].sort((a, b) => a - b);

  return (
    <Card.Root gridColumn={{ lg: "1 / -1" }} bg={cardBg}>
      <Card.Header>
        <HStack justifyContent="space-between">
          <HStack gap={2}>
            <LuSwords />
            <Text fontWeight="semibold" fontSize="lg">Matches</Text>
            {matches.length > 0 && !isDoubleElim && !isRROrSwiss && (
              <Badge colorPalette="gray" variant="subtle">
                Round {Math.max(...matches.map((m) => m.round))} of {roundNumbers.length}
              </Badge>
            )}
            {isRoundRobin && (
              <Badge colorPalette="teal" variant="subtle">
                Round Robin
              </Badge>
            )}
            {isSwiss && (
              <Badge colorPalette="purple" variant="subtle">
                Swiss System
              </Badge>
            )}
            {isDoubleElim && (
              <Badge colorPalette="blue" variant="subtle">
                Double Elimination
              </Badge>
            )}
          </HStack>
          {matchLoading && <Spinner size="sm" />}
        </HStack>
      </Card.Header>
      <Card.Body>
        {matches.length === 0 ? (
          <Text color="fg.muted" textAlign="center" py={4}>
            No Matches Generated Yet
          </Text>
        ) : (
          <VStack gap={6} alignItems="stretch">
            {isRROrSwiss && standings.length > 0 && (
              <Box>
                <Text
                  fontWeight="semibold"
                  fontSize="sm"
                  color="fg.muted"
                  textTransform="uppercase"
                  letterSpacing="wider"
                  mb={2}
                >
                  Standings
                </Text>
                <Table.Root size="sm" variant="outline">
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader>#</Table.ColumnHeader>
                      <Table.ColumnHeader>Player</Table.ColumnHeader>
                      <Table.ColumnHeader>Faction</Table.ColumnHeader>
                      <Table.ColumnHeader textAlign="center">W</Table.ColumnHeader>
                      <Table.ColumnHeader textAlign="center">L</Table.ColumnHeader>
                      <Table.ColumnHeader textAlign="center">Played</Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {standings.map((s, i) => (
                      <Table.Row key={s.name}>
                        <Table.Cell color="fg.muted">{i + 1}</Table.Cell>
                        <Table.Cell fontWeight={i === 0 ? "bold" : "normal"}>{s.name}</Table.Cell>
                        <Table.Cell color="fg.muted">{s.faction || "-"}</Table.Cell>
                        <Table.Cell textAlign="center" color="green.fg">{s.wins}</Table.Cell>
                        <Table.Cell textAlign="center" color="red.fg">{s.losses}</Table.Cell>
                        <Table.Cell textAlign="center">{s.played}</Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
                <Separator mt={4} />
              </Box>
            )}

            {isDoubleElim && (
              <>
                {wbRounds.length > 0 && (
                  <Box>
                    <HStack mb={3} gap={2}>
                      <Text
                        fontWeight="semibold"
                        fontSize="sm"
                        textTransform="uppercase"
                        letterSpacing="wider"
                        color="blue.fg"
                      >
                        Winners Bracket
                      </Text>
                      <Badge colorPalette="blue" size="sm" variant="subtle">
                        W
                      </Badge>
                    </HStack>
                    <VStack gap={4} alignItems="stretch">
                      {wbRounds.map((round) => (
                        <Box key={`wb-${round}`}>
                          <Text fontSize="xs" color="fg.muted" fontWeight="medium" mb={2}>
                            Round {round}
                          </Text>
                          <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
                            <For each={wbMatches.filter((m) => m.round === round)}>
                              {(m) => {
                                const p1Won = m.winnerId === m.player1.participantId;
                                const p2Won = m.winnerId === m.player2.participantId;
                                const isOverriding = overrideMatchId === m._id;
                                const { isP1, isP2, myReport, canPR } = resolveMatchUser(m, user, isAdmin, isActive);
                                return (
                                  <MatchCard
                                    key={m._id}
                                    m={m}
                                    p1Won={p1Won}
                                    p2Won={p2Won}
                                    isOverriding={isOverriding}
                                    isAdmin={isAdmin}
                                    isActive={isActive}
                                    myReport={myReport}
                                    canParticipantReport={canPR}
                                    isP1={isP1}
                                    isP2={isP2}
                                    actionLoading={actionLoading}
                                    overrideLoading={overrideLoading}
                                    overrideWinnerId={overrideWinnerId}
                                    overrideReason={overrideReason}
                                    borderColor={borderColor}
                                    mutedBg={mutedBg}
                                    onRecordResult={onRecordResult}
                                    onReportResult={onReportResult}
                                    onResolveDispute={onResolveDispute}
                                    onStartOverride={() => {
                                      setOverrideMatchId(m._id);
                                      setOverrideWinnerId("");
                                      setOverrideReason("");
                                    }}
                                    onCancelOverride={() => setOverrideMatchId(null)}
                                    onSetOverrideWinner={setOverrideWinnerId}
                                    onSetOverrideReason={setOverrideReason}
                                    onConfirmOverride={handleOverrideConfirm}
                                  />
                                );
                              }}
                            </For>
                          </SimpleGrid>
                        </Box>
                      ))}
                    </VStack>
                  </Box>
                )}
                {lbRounds.length > 0 && (
                  <Box>
                    <HStack mb={3} gap={2}>
                      <Text
                        fontWeight="semibold"
                        fontSize="sm"
                        textTransform="uppercase"
                        letterSpacing="wider"
                        color="orange.fg"
                      >
                        Losers Bracket
                      </Text>
                      <Badge colorPalette="orange" size="sm" variant="subtle">
                        L
                      </Badge>
                    </HStack>
                    <VStack gap={4} alignItems="stretch">
                      {lbRounds.map((round) => (
                        <Box key={`lb-${round}`}>
                          <Text fontSize="xs" color="fg.muted" fontWeight="medium" mb={2}>
                            Round {round}
                          </Text>
                          <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
                            <For each={lbMatches.filter((m) => m.round === round)}>
                              {(m) => {
                                const p1Won = m.winnerId === m.player1.participantId;
                                const p2Won = m.winnerId === m.player2.participantId;
                                const isOverriding = overrideMatchId === m._id;
                                const { isP1, isP2, myReport, canPR } = resolveMatchUser(m, user, isAdmin, isActive);
                                return (
                                  <MatchCard
                                    key={m._id}
                                    m={m}
                                    p1Won={p1Won}
                                    p2Won={p2Won}
                                    isOverriding={isOverriding}
                                    isAdmin={isAdmin}
                                    isActive={isActive}
                                    myReport={myReport}
                                    canParticipantReport={canPR}
                                    isP1={isP1}
                                    isP2={isP2}
                                    actionLoading={actionLoading}
                                    overrideLoading={overrideLoading}
                                    overrideWinnerId={overrideWinnerId}
                                    overrideReason={overrideReason}
                                    borderColor={borderColor}
                                    mutedBg={mutedBg}
                                    onRecordResult={onRecordResult}
                                    onReportResult={onReportResult}
                                    onResolveDispute={onResolveDispute}
                                    onStartOverride={() => {
                                      setOverrideMatchId(m._id);
                                      setOverrideWinnerId("");
                                      setOverrideReason("");
                                    }}
                                    onCancelOverride={() => setOverrideMatchId(null)}
                                    onSetOverrideWinner={setOverrideWinnerId}
                                    onSetOverrideReason={setOverrideReason}
                                    onConfirmOverride={handleOverrideConfirm}
                                  />
                                );
                              }}
                            </For>
                          </SimpleGrid>
                        </Box>
                      ))}
                    </VStack>
                  </Box>
                )}
                {gfMatches.length > 0 && (
                  <Box>
                    <HStack mb={3} gap={2}>
                      <LuTrophy />
                      <Text
                        fontWeight="semibold"
                        fontSize="sm"
                        textTransform="uppercase"
                        letterSpacing="wider"
                        color="yellow.fg"
                      >
                        Grand Final
                      </Text>
                      {gfMatches.length > 1 && (
                        <Badge colorPalette="yellow" size="sm" variant="subtle">
                          Bracket Reset
                        </Badge>
                      )}
                    </HStack>
                    <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
                      <For each={gfMatches}>
                        {(m) => {
                          const p1Won = m.winnerId === m.player1.participantId;
                          const p2Won = m.winnerId === m.player2.participantId;
                          const isOverriding = overrideMatchId === m._id;
                          const { isP1, isP2, myReport, canPR } = resolveMatchUser(m, user, isAdmin, isActive);
                          return (
                            <MatchCard
                              key={m._id}
                              m={m}
                              p1Won={p1Won}
                              p2Won={p2Won}
                              isOverriding={isOverriding}
                              isAdmin={isAdmin}
                              isActive={isActive}
                              myReport={myReport}
                              canParticipantReport={canPR}
                              isP1={isP1}
                              isP2={isP2}
                              actionLoading={actionLoading}
                              overrideLoading={overrideLoading}
                              overrideWinnerId={overrideWinnerId}
                              overrideReason={overrideReason}
                              borderColor={borderColor}
                              mutedBg={mutedBg}
                              onRecordResult={onRecordResult}
                              onReportResult={onReportResult}
                              onResolveDispute={onResolveDispute}
                              onStartOverride={() => {
                                setOverrideMatchId(m._id);
                                setOverrideWinnerId("");
                                setOverrideReason("");
                              }}
                              onCancelOverride={() => setOverrideMatchId(null)}
                              onSetOverrideWinner={setOverrideWinnerId}
                              onSetOverrideReason={setOverrideReason}
                              onConfirmOverride={handleOverrideConfirm}
                            />
                          );
                        }}
                      </For>
                    </SimpleGrid>
                  </Box>
                )}
              </>
            )}

            {!isDoubleElim && (
              <For each={roundNumbers}>
                {(round) => {
                  const maxRound = Math.max(...matches.map((m) => m.round));
                  const isCurrentRound = round === maxRound && isActive;
                  return (
                    <Box key={round}>
                      <HStack mb={3} gap={2}>
                        <Text
                          fontWeight="semibold"
                          fontSize="sm"
                          color={isCurrentRound ? "blue.fg" : "fg.muted"}
                          textTransform="uppercase"
                          letterSpacing="wider"
                        >
                          {isRROrSwiss ? `Round ${round} of ${roundNumbers.length}` : `Round ${round}`}
                        </Text>
                        {isCurrentRound && !isRROrSwiss && (
                          <Badge colorPalette="blue" size="sm" variant="subtle">
                            Current
                          </Badge>
                        )}
                        {!isCurrentRound && round < maxRound && !isRROrSwiss && (
                          <Badge colorPalette="gray" size="sm" variant="subtle">
                            Completed
                          </Badge>
                        )}
                      </HStack>
                      <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
                        <For each={matches.filter((m) => m.round === round)}>
                          {(m) => {
                            const p1Won = m.winnerId === m.player1.participantId;
                            const p2Won = m.winnerId === m.player2.participantId;
                            const isOverriding = overrideMatchId === m._id;
                            const { isP1, isP2, myReport, canPR } = resolveMatchUser(m, user, isAdmin, isActive);
                            return (
                              <MatchCard
                                key={m._id}
                                m={m}
                                p1Won={p1Won}
                                p2Won={p2Won}
                                isOverriding={isOverriding}
                                isAdmin={isAdmin}
                                isActive={isActive}
                                myReport={myReport}
                                canParticipantReport={canPR}
                                isP1={isP1}
                                isP2={isP2}
                                actionLoading={actionLoading}
                                overrideLoading={overrideLoading}
                                overrideWinnerId={overrideWinnerId}
                                overrideReason={overrideReason}
                                borderColor={borderColor}
                                mutedBg={mutedBg}
                                onRecordResult={onRecordResult}
                                onReportResult={onReportResult}
                                onResolveDispute={onResolveDispute}
                                onStartOverride={() => {
                                  setOverrideMatchId(m._id);
                                  setOverrideWinnerId("");
                                  setOverrideReason("");
                                }}
                                onCancelOverride={() => setOverrideMatchId(null)}
                                onSetOverrideWinner={setOverrideWinnerId}
                                onSetOverrideReason={setOverrideReason}
                                onConfirmOverride={handleOverrideConfirm}
                              />
                            );
                          }}
                        </For>
                      </SimpleGrid>
                    </Box>
                  );
                }}
              </For>
            )}
          </VStack>
        )}
      </Card.Body>
      {isAdmin && isActive && matches.length > 0 && (
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
                  ? `${matches.filter((m) => m.status === "completed").length} / ${matches.length} matches`
                  : `Round ${Math.max(...matches.filter((m) => m.bracketSide !== "losers" && m.bracketSide !== "grand_final").map((m) => m.round))} of ${roundNumbers.length}`}
              </Text>
              <Badge colorPalette="blue" variant="subtle" size="sm">
                {matches.filter((m) => m.status === "completed").length}/ {matches.length} matches done
              </Badge>
            </HStack>
            <Button colorPalette="blue" size="sm" onClick={onAdvanceRound} loading={actionLoading}>
              <LuChevronsRight />
              {isRoundRobin
                ? "Finalize Tournament"
                : isSwiss &&
                    Math.max(...matches.map((m) => m.round)) >=
                      Math.ceil(Math.log2(Math.max(selected.participants.length, 2)))
                  ? "Finalize Tournament"
                  : "Advance Round"}
            </Button>
          </Flex>
        </Card.Footer>
      )}
    </Card.Root>
  );
};

export default MatchesSection;
