import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Container,
  Heading,
  Text,
  Box,
  VStack,
  HStack,
  SimpleGrid,
  Card,
  Badge,
  Button,
  Input,
  Field,
  Spinner,
  Separator,
  For,
  chakra,
  Dialog,
  Portal,
} from "@chakra-ui/react";
import {
  LuTrophy,
  LuTrash2,
  LuPlay,
  LuUserPlus,
  LuUsers,
  LuX,
  LuChevronLeft,
  LuSwords,
  LuShieldAlert,
  LuCopy,
  LuEye,
  LuPencil,
  LuChevronsRight,
  LuClock,
  LuCircleCheck,
} from "react-icons/lu";
import { useNavigate, useLocation } from "react-router-dom";
import { httpClient } from "@/core/api/httpClient";
import { useColorModeValue } from "@/shared/ui/ColorMode";
import { useUserStore } from "@/shared/stores/userStore";

const warhammer3Factions = [
  "Empire",
  "Dwarfs",
  "Greenskins",
  "Vampire Counts",
  "Chaos Warriors",
  "Bretonnia",
  "Wood Elves",
  "Beastmen",
  "Skaven",
  "Lizardmen",
  "High Elves",
  "Dark Elves",
  "Tomb Kings",
  "Ogre Kingdoms",
  "Norsca",
  "Nurgle",
  "Tzeentch",
  "Slaanesh",
  "Khorne",
  "Grand Cathay",
  "Kislev",
  "Ogres",
  "Chaos Dwarfs",
];

interface Match {
  _id: string;
  round: number;
  matchNumber: number;
  player1: { participantId: string; name: string; faction: string };
  player2: { participantId: string; name: string; faction: string };
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
}

interface Participant {
  _id: string;
  name: string;
  faction: string;
}

interface Tournament {
  _id: string;
  name: string;
  code: string;
  description: string;
  playerCount: number;
  tournamentType: string;
  bannedFactions: string[];
  participants: Participant[];
  status: "pending" | "active" | "completed";
  createdAt: string;
  createdBy: string;
}

const statusColorMap: Record<string, string> = {
  pending: "yellow",
  active: "green",
  completed: "gray",
};

const MatchesPage: React.FC = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selected, setSelected] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { user, isAuthenticated } = useUserStore();

  const [newName, setNewName] = useState("");
  const [newFaction, setNewFaction] = useState("");

  const [matches, setMatches] = useState<Match[]>([]);
  const [matchLoading, setMatchLoading] = useState(false);
  const [overrideMatchId, setOverrideMatchId] = useState<string | null>(null);
  const [overrideWinnerId, setOverrideWinnerId] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideLoading, setOverrideLoading] = useState(false);

  const [editingParticipant, setEditingParticipant] =
    useState<Participant | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const navigate = useNavigate();
  const { hash } = useLocation();
  const initialHashHandled = useRef(false);
  const [codeCopied, setCodeCopied] = useState(false);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const selectedBg = useColorModeValue("blue.50", "blue.900");
  const mutedBg = useColorModeValue("gray.50", "gray.900");

  const fetchTournaments = useCallback(async () => {
    if (!isAuthenticated()) {
      setLoading(false);
      setTournaments([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = (await httpClient.get("/tournament/mine")) as {
        success: boolean;
        data: Tournament[];
      };
      setTournaments(res.data ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load tournaments",
      );
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchTournaments();
  }, [fetchTournaments]);

  const fetchMatches = useCallback(async (tournamentId: string) => {
    setMatchLoading(true);
    try {
      const res = (await httpClient.get(
        `/match/tournament/${tournamentId}`,
      )) as { success: boolean; data: Match[] };
      setMatches(res.data ?? []);
    } catch {
      setMatches([]);
    } finally {
      setMatchLoading(false);
    }
  }, []);

  const refreshSelected = useCallback(
    async (id: string) => {
      try {
        const res = (await httpClient.get(`/tournament/${id}`)) as {
          success: boolean;
          data: Tournament;
        };
        setSelected(res.data);
        setTournaments((prev) =>
          prev.map((t) => (t._id === id ? res.data : t)),
        );
        if (res.data.status === "active" || res.data.status === "completed") {
          await fetchMatches(id);
        }
      } catch {
        // silently fail — list will still show
      }
    },
    [fetchMatches],
  );

  const handleAddParticipant = async () => {
    if (!selected || !newName.trim()) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await httpClient.post(`/tournament/${selected._id}/participants`, {
        name: newName.trim(),
        faction: newFaction,
      });
      setNewName("");
      setNewFaction("");
      await refreshSelected(selected._id);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to add participant",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveParticipant = async (participantId: string) => {
    if (!selected) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await httpClient.delete(
        `/tournament/${selected._id}/participants/${participantId}`,
      );
      await refreshSelected(selected._id);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to remove participant",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecordResult = async (matchId: string, winnerId: string) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await httpClient.patch(`/match/${matchId}/result`, { winnerId });
      if (selected) await fetchMatches(selected._id);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to record result",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleReportResult = async (matchId: string, winnerId: string) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await httpClient.patch(`/match/${matchId}/report`, { winnerId });
      if (selected) await fetchMatches(selected._id);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to report result",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleOverrideResult = async () => {
    if (!overrideMatchId || !overrideWinnerId) return;
    setOverrideLoading(true);
    setActionError(null);
    try {
      await httpClient.patch(`/match/${overrideMatchId}/override`, {
        winnerId: overrideWinnerId,
        reason: overrideReason,
      });
      setOverrideMatchId(null);
      setOverrideWinnerId("");
      setOverrideReason("");
      if (selected) await fetchMatches(selected._id);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to override result",
      );
    } finally {
      setOverrideLoading(false);
    }
  };

  const handleStart = async () => {
    if (!selected) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await httpClient.post(`/tournament/${selected._id}/start`, {});
      await refreshSelected(selected._id);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to start tournament",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateParticipant = async () => {
    if (!selected || !editingParticipant) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await httpClient.patch(
        `/tournament/${selected._id}/participants/${editingParticipant._id}`,
        { name: editingParticipant.name, faction: editingParticipant.faction },
      );
      setEditDialogOpen(false);
      setEditingParticipant(null);
      await refreshSelected(selected._id);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to update participant",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveDispute = async (matchId: string, winnerId: string) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await httpClient.patch(`/match/${matchId}/resolve`, { winnerId });
      if (selected) await fetchMatches(selected._id);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to resolve dispute",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdvanceRound = async () => {
    if (!selected) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await httpClient.post(`/tournament/${selected._id}/advance`, {});
      await refreshSelected(selected._id);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to advance round",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await httpClient.delete(`/tournament/${selected._id}`);
      setSelected(null);
      await fetchTournaments();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to delete tournament",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelectTournament = useCallback(
    async (t: Tournament) => {
      setSelected(t);
      setActionError(null);
      navigate(`#${t._id}`, { replace: true });
      if (t.status === "active" || t.status === "completed") {
        await fetchMatches(t._id);
      } else {
        setMatches([]);
      }
    },
    [fetchMatches, navigate],
  );

  useEffect(() => {
    if (initialHashHandled.current) return;
    if (!loading && tournaments.length > 0 && hash) {
      const id = hash.slice(1);
      const found = tournaments.find((t) => t._id === id);
      if (found) {
        initialHashHandled.current = true;
        handleSelectTournament(found);
      }
    }
  }, [loading, tournaments, hash, handleSelectTournament]);

  const selectedStatus = selected?.status;
  const selectedId = selected?._id;
  useEffect(() => {
    if (!selectedId || selectedStatus === "completed") return;
    const interval = setInterval(() => refreshSelected(selectedId), 5000);
    return () => clearInterval(interval);
  }, [selectedId, selectedStatus, refreshSelected]);

  if (loading) {
    return (
      <Container maxW="container.xl" py={8}>
        <VStack gap={4} py={16}>
          <Spinner size="xl" />
          <Text color="fg.muted">Loading Matches...</Text>
        </VStack>
      </Container>
    );
  }

  if (selected) {
    const isFull = selected.participants.length >= selected.playerCount;
    const isAdmin = selected.createdBy === user?.id;
    const canStart =
      isAdmin &&
      selected.status === "pending" &&
      selected.participants.length >= 2;
    const canDelete = isAdmin && selected.status === "pending";
    const isPending = selected.status === "pending";
    const isActive = selected.status === "active";
    const roundNumbers = [...new Set(matches.map((m) => m.round))].sort(
      (a, b) => a - b,
    );

    return (
      <Container maxW="container.xl" py={8}>
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          mb={6}
          onClick={() => {
            setSelected(null);
            navigate("/matches", { replace: true });
          }}
        >
          <LuChevronLeft />
          Back to Match Management View
        </Button>

        {/* Header */}
        <HStack mb={6} gap={4} wrap="wrap" alignItems="flex-start">
          <VStack alignItems="flex-start" gap={1} flex={1}>
            <HStack gap={3} wrap="wrap">
              <Heading as="h1" size="xl">
                {selected.name}
              </Heading>
              <Badge colorPalette={statusColorMap[selected.status]} size="lg">
                {selected.status.charAt(0).toUpperCase() +
                  selected.status.slice(1)}
              </Badge>
            </HStack>
            <HStack gap={3} color="fg.muted" fontSize="sm" wrap="wrap">
              <Text>{selected.tournamentType}</Text>
              <Text>·</Text>
              <Text>
                {selected.participants.length}/{selected.playerCount} players
              </Text>
              {selected.code && (
                <>
                  <Text>·</Text>
                  <Text
                    fontFamily="mono"
                    fontWeight="bold"
                    letterSpacing="wider"
                  >
                    Code: {selected.code}
                  </Text>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => handleCopyCode(selected.code)}
                    colorPalette={codeCopied ? "green" : "gray"}
                  >
                    <LuCopy />
                    {codeCopied ? "Copied!" : "Copy"}
                  </Button>
                </>
              )}
            </HStack>
            {selected.description && (
              <Text color="fg.muted" mt={1}>
                {selected.description}
              </Text>
            )}
          </VStack>
          <HStack gap={2}>
            <Button
              size="sm"
              variant="ghost"
              colorPalette="blue"
              onClick={() => navigate(`/matches/spectate/${selected._id}`)}
            >
              <LuEye />
              Spectator View
            </Button>
            {canStart && (
              <Button
                colorPalette="green"
                size="sm"
                onClick={handleStart}
                loading={actionLoading}
              >
                <LuPlay />
                Start Tournament
              </Button>
            )}
            {isAdmin &&
              isActive &&
              matches.length > 0 &&
              (() => {
                const maxRound = Math.max(...matches.map((m) => m.round));
                return matches
                  .filter((m) => m.round === maxRound)
                  .every((m) => m.status === "completed");
              })() && (
                <Button
                  colorPalette="blue"
                  size="sm"
                  onClick={handleAdvanceRound}
                  loading={actionLoading}
                >
                  <LuChevronsRight />
                  Advance Round
                </Button>
              )}
            {canDelete && (
              <Button
                colorPalette="red"
                variant="outline"
                size="sm"
                onClick={handleDelete}
                loading={actionLoading}
              >
                <LuTrash2 />
                Delete
              </Button>
            )}
          </HStack>
        </HStack>

        {actionError && (
          <Box
            mb={6}
            p={3}
            bg="red.subtle"
            borderRadius="md"
            borderWidth={1}
            borderColor="red.muted"
          >
            <Text color="red.600">{actionError}</Text>
          </Box>
        )}

        <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6}>
          {/* Participants */}
          <Card.Root bg={cardBg}>
            <Card.Header>
              <HStack gap={2}>
                <LuUsers />
                <Heading size="md">
                  Participants ({selected.participants.length}/
                  {selected.playerCount})
                </Heading>
              </HStack>
            </Card.Header>
            <Card.Body>
              {selected.participants.length === 0 ? (
                <Text color="fg.muted" textAlign="center" py={4}>
                  No Participants Yet
                </Text>
              ) : (
                <VStack gap={2} alignItems="stretch">
                  <For each={selected.participants}>
                    {(p) => (
                      <HStack
                        key={p._id}
                        p={3}
                        borderRadius="md"
                        borderWidth={1}
                        borderColor={borderColor}
                        bg={selectedBg}
                        justifyContent="space-between"
                      >
                        <VStack alignItems="flex-start" gap={0}>
                          <Text fontWeight="medium">{p.name}</Text>
                          {p.faction && (
                            <Text fontSize="xs" color="fg.muted">
                              {p.faction}
                            </Text>
                          )}
                        </VStack>
                        <HStack gap={1}>
                          {isAdmin && (
                            <Button
                              size="xs"
                              variant="ghost"
                              colorPalette="blue"
                              onClick={() => {
                                setEditingParticipant(p);
                                setEditDialogOpen(true);
                              }}
                              aria-label="Edit participant"
                            >
                              <LuPencil />
                            </Button>
                          )}
                          {isAdmin && isPending && (
                            <Button
                              size="xs"
                              variant="ghost"
                              colorPalette="red"
                              onClick={() => handleRemoveParticipant(p._id)}
                              loading={actionLoading}
                              aria-label="Remove participant"
                            >
                              <LuX />
                            </Button>
                          )}
                        </HStack>
                      </HStack>
                    )}
                  </For>
                </VStack>
              )}
            </Card.Body>
          </Card.Root>

          {/* Add Participant (admin only, pending) or Tournament Info (active/completed) */}
          {isAdmin && isPending ? (
            <Card.Root bg={cardBg}>
              <Card.Header>
                <Heading size="md">Add Participant</Heading>
                {isFull && (
                  <Text fontSize="sm" color="orange.500" mt={1}>
                    Tournament is full
                  </Text>
                )}
              </Card.Header>
              <Card.Body>
                <VStack gap={4}>
                  <Field.Root>
                    <Field.Label>Player Name</Field.Label>
                    <Input
                      placeholder="Enter player name"
                      value={newName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNewName(e.target.value)
                      }
                      disabled={isFull}
                      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                        e.key === "Enter" && handleAddParticipant()
                      }
                    />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>
                      Faction{" "}
                      <Text as="span" color="fg.muted" fontSize="sm">
                        (optional)
                      </Text>
                    </Field.Label>
                    <chakra.select
                      value={newFaction}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        setNewFaction(e.target.value)
                      }
                      disabled={isFull}
                      w="full"
                      borderRadius="md"
                      borderWidth="1px"
                      borderColor="border"
                      fontSize="sm"
                      color="fg"
                      p={2}
                    >
                      <option value="">No Faction</option>
                      {warhammer3Factions
                        .filter((f) => !selected.bannedFactions.includes(f))
                        .map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                    </chakra.select>
                  </Field.Root>
                  <Button
                    width="full"
                    colorPalette="blue"
                    onClick={handleAddParticipant}
                    disabled={!newName.trim() || isFull}
                    loading={actionLoading}
                  >
                    <LuUserPlus />
                    Add Participant
                  </Button>
                </VStack>
              </Card.Body>
            </Card.Root>
          ) : (
            <Card.Root bg={cardBg}>
              <Card.Header>
                <HStack gap={2}>
                  <LuTrophy />
                  <Heading size="md">Tournament Info</Heading>
                </HStack>
              </Card.Header>
              <Card.Body>
                <VStack gap={3} alignItems="stretch">
                  <HStack justifyContent="space-between">
                    <Text color="fg.muted" fontSize="sm">
                      Format
                    </Text>
                    <Text fontWeight="medium">{selected.tournamentType}</Text>
                  </HStack>
                  <Separator />
                  <HStack justifyContent="space-between">
                    <Text color="fg.muted" fontSize="sm">
                      Players
                    </Text>
                    <Text fontWeight="medium">
                      {selected.participants.length}/{selected.playerCount}
                    </Text>
                  </HStack>
                  <Separator />
                  <HStack justifyContent="space-between">
                    <Text color="fg.muted" fontSize="sm">
                      Status
                    </Text>
                    <Badge colorPalette={statusColorMap[selected.status]}>
                      {selected.status.charAt(0).toUpperCase() +
                        selected.status.slice(1)}
                    </Badge>
                  </HStack>
                  <Separator />
                  <HStack justifyContent="space-between">
                    <Text color="fg.muted" fontSize="sm">
                      Created
                    </Text>
                    <Text fontSize="sm">
                      {new Date(selected.createdAt).toLocaleDateString()}
                    </Text>
                  </HStack>
                  {selected.bannedFactions.length > 0 && (
                    <>
                      <Separator />
                      <VStack alignItems="flex-start" gap={1}>
                        <Text color="fg.muted" fontSize="sm">
                          Banned Factions
                        </Text>
                        <HStack wrap="wrap" gap={1}>
                          <For each={selected.bannedFactions}>
                            {(f) => (
                              <Badge
                                key={f}
                                colorPalette="red"
                                size="sm"
                                variant="subtle"
                              >
                                {f}
                              </Badge>
                            )}
                          </For>
                        </HStack>
                      </VStack>
                    </>
                  )}
                </VStack>
              </Card.Body>
            </Card.Root>
          )}

          {/* Champion banner for completed tournaments */}
          {selected.status === "completed" &&
            (() => {
              const finalRound = Math.max(...matches.map((m) => m.round));
              const finalMatch = matches.find(
                (m) => m.round === finalRound && m.winnerId,
              );
              if (!finalMatch) return null;
              const champion =
                finalMatch.winnerId === finalMatch.player1.participantId
                  ? finalMatch.player1
                  : finalMatch.player2;
              return (
                <Box
                  mb={0}
                  p={5}
                  borderRadius="lg"
                  bg="yellow.subtle"
                  borderWidth={1}
                  borderColor="yellow.muted"
                  textAlign="center"
                  gridColumn={{ lg: "1 / -1" }}
                >
                  <HStack justifyContent="center" gap={3}>
                    <LuTrophy
                      size={24}
                      color="var(--chakra-colors-yellow-500)"
                    />
                    <VStack gap={0}>
                      <Text
                        fontSize="xs"
                        fontWeight="semibold"
                        textTransform="uppercase"
                        letterSpacing="wider"
                        color="fg.muted"
                      >
                        Tournament Champion
                      </Text>
                      <Text fontSize="2xl" fontWeight="bold">
                        {champion.name}
                      </Text>
                      {champion.faction && (
                        <Text fontSize="sm" color="fg.muted">
                          {champion.faction}
                        </Text>
                      )}
                    </VStack>
                    <LuTrophy
                      size={24}
                      color="var(--chakra-colors-yellow-500)"
                    />
                  </HStack>
                </Box>
              );
            })()}

          {/* Matches */}
          {(isActive || selected.status === "completed") && (
            <Card.Root gridColumn={{ lg: "1 / -1" }} bg={cardBg}>
              <Card.Header>
                <HStack justifyContent="space-between">
                  <HStack gap={2}>
                    <LuSwords />
                    <Heading size="md">Matches</Heading>
                    {matches.length > 0 && (
                      <Badge colorPalette="gray" variant="subtle">
                        Round {Math.max(...matches.map((m) => m.round))} of{" "}
                        {roundNumbers.length}
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
                    <For each={roundNumbers}>
                      {(round) => {
                        const maxRound = Math.max(
                          ...matches.map((m) => m.round),
                        );
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
                                Round {round}
                              </Text>
                              {isCurrentRound && (
                                <Badge
                                  colorPalette="blue"
                                  size="sm"
                                  variant="subtle"
                                >
                                  Current
                                </Badge>
                              )}
                              {!isCurrentRound && round < maxRound && (
                                <Badge
                                  colorPalette="gray"
                                  size="sm"
                                  variant="subtle"
                                >
                                  Completed
                                </Badge>
                              )}
                            </HStack>
                            <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
                              <For
                                each={matches.filter((m) => m.round === round)}
                              >
                                {(m) => {
                                  const p1Won =
                                    m.winnerId === m.player1.participantId;
                                  const p2Won =
                                    m.winnerId === m.player2.participantId;
                                  const isOverriding =
                                    overrideMatchId === m._id;
                                  const userName = user?.username
                                    ?.trim()
                                    .toLowerCase();
                                  const userId = user?.id;
                                  const isP1 =
                                    m.player1.participantId === userId ||
                                    (userName &&
                                      m.player1.name.trim().toLowerCase() ===
                                        userName) ||
                                    m.player1.name === userId;
                                  const isP2 =
                                    m.player2.participantId === userId ||
                                    (userName &&
                                      m.player2.name.trim().toLowerCase() ===
                                        userName) ||
                                    m.player2.name === userId;
                                  const myReport = m.reportedResults?.find(
                                    (r) =>
                                      r.reportedBy ===
                                        (isP1
                                          ? m.player1.participantId
                                          : m.player2.participantId) ||
                                      r.reportedByName === userName,
                                  );
                                  const canParticipantReport =
                                    !isAdmin &&
                                    (isP1 || isP2) &&
                                    isActive &&
                                    m.status !== "completed" &&
                                    m.status !== "disputed";
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
                                      <HStack
                                        mb={2}
                                        justifyContent="space-between"
                                      >
                                        <Text fontSize="xs" color="fg.subtle">
                                          Match {m.matchNumber}
                                        </Text>
                                        {m.status === "completed" && (
                                          <Badge
                                            colorPalette="green"
                                            size="sm"
                                            variant="subtle"
                                          >
                                            <LuCircleCheck /> Completed
                                          </Badge>
                                        )}
                                        {m.status === "disputed" && (
                                          <Badge
                                            colorPalette="orange"
                                            size="sm"
                                            variant="solid"
                                          >
                                            ⚠ Disputed
                                          </Badge>
                                        )}
                                        {m.status === "in_progress" && (
                                          <Badge
                                            colorPalette="blue"
                                            size="sm"
                                            variant="subtle"
                                          >
                                            <LuClock /> In Progress
                                          </Badge>
                                        )}
                                        {m.status === "pending" && (
                                          <Badge
                                            colorPalette="gray"
                                            size="sm"
                                            variant="subtle"
                                          >
                                            Pending
                                          </Badge>
                                        )}
                                      </HStack>
                                      <HStack
                                        gap={4}
                                        justifyContent="space-between"
                                        wrap="wrap"
                                      >
                                        <VStack
                                          alignItems="flex-start"
                                          gap={0}
                                          flex={1}
                                        >
                                          <HStack gap={1}>
                                            {p1Won && (
                                              <Badge
                                                colorPalette="green"
                                                size="sm"
                                              >
                                                W
                                              </Badge>
                                            )}
                                            {m.winnerId && !p1Won && (
                                              <Badge
                                                colorPalette="red"
                                                size="sm"
                                              >
                                                L
                                              </Badge>
                                            )}
                                            <Text
                                              fontWeight={
                                                p1Won ? "bold" : "medium"
                                              }
                                            >
                                              {m.player1.name}
                                            </Text>
                                          </HStack>
                                          {m.player1.faction && (
                                            <Text
                                              fontSize="xs"
                                              color="fg.muted"
                                            >
                                              {m.player1.faction}
                                            </Text>
                                          )}
                                        </VStack>
                                        <VStack gap={0}>
                                          <Text
                                            color="fg.muted"
                                            fontWeight="bold"
                                            fontSize="sm"
                                          >
                                            vs
                                          </Text>
                                        </VStack>
                                        <VStack
                                          alignItems="flex-end"
                                          gap={0}
                                          flex={1}
                                        >
                                          <HStack gap={1}>
                                            {p2Won && (
                                              <Badge
                                                colorPalette="green"
                                                size="sm"
                                              >
                                                W
                                              </Badge>
                                            )}
                                            {m.winnerId &&
                                              !p2Won &&
                                              m.player2.name !== "BYE" && (
                                                <Badge
                                                  colorPalette="red"
                                                  size="sm"
                                                >
                                                  L
                                                </Badge>
                                              )}
                                            <Text
                                              fontWeight={
                                                p2Won ? "bold" : "medium"
                                              }
                                              color={
                                                m.player2.name === "BYE"
                                                  ? "fg.subtle"
                                                  : undefined
                                              }
                                              fontStyle={
                                                m.player2.name === "BYE"
                                                  ? "italic"
                                                  : undefined
                                              }
                                            >
                                              {m.player2.name}
                                            </Text>
                                          </HStack>
                                          {m.player2.faction &&
                                            m.player2.name !== "BYE" && (
                                              <Text
                                                fontSize="xs"
                                                color="fg.muted"
                                              >
                                                {m.player2.faction}
                                              </Text>
                                            )}
                                        </VStack>
                                        {isAdmin &&
                                          isActive &&
                                          m.status === "disputed" && (
                                            <VStack
                                              gap={2}
                                              flexShrink={0}
                                              alignItems="flex-start"
                                            >
                                              <Text
                                                fontSize="xs"
                                                color="orange.400"
                                                fontWeight="bold"
                                              >
                                                ⚠ Disputed — resolve:
                                              </Text>
                                              {(m.reportedResults ?? []).map(
                                                (r) => {
                                                  const reporterName =
                                                    r.reportedBy ===
                                                    m.player1.participantId
                                                      ? m.player1.name
                                                      : r.reportedBy ===
                                                          m.player2
                                                            .participantId
                                                        ? m.player2.name
                                                        : r.reportedByName;
                                                  const votedForName =
                                                    r.winnerId ===
                                                    m.player1.participantId
                                                      ? m.player1.name
                                                      : m.player2.name;
                                                  return (
                                                    <Text
                                                      key={r.reportedBy}
                                                      fontSize="xs"
                                                      color="fg.muted"
                                                    >
                                                      <strong>
                                                        {reporterName}
                                                      </strong>{" "}
                                                      says{" "}
                                                      <strong>
                                                        {votedForName}
                                                      </strong>{" "}
                                                      won
                                                    </Text>
                                                  );
                                                },
                                              )}
                                              <Button
                                                size="xs"
                                                colorPalette="orange"
                                                variant="solid"
                                                onClick={() =>
                                                  handleResolveDispute(
                                                    m._id,
                                                    m.player1.participantId,
                                                  )
                                                }
                                                loading={actionLoading}
                                              >
                                                {m.player1.name} wins
                                              </Button>
                                              <Button
                                                size="xs"
                                                colorPalette="orange"
                                                variant="solid"
                                                onClick={() =>
                                                  handleResolveDispute(
                                                    m._id,
                                                    m.player2.participantId,
                                                  )
                                                }
                                                loading={actionLoading}
                                              >
                                                {m.player2.name} wins
                                              </Button>
                                            </VStack>
                                          )}
                                        {isAdmin &&
                                          isActive &&
                                          m.status !== "completed" &&
                                          m.status !== "disputed" &&
                                          m.player2.name !== "BYE" && (
                                            <VStack gap={1} flexShrink={0}>
                                              <Text
                                                fontSize="xs"
                                                color="fg.muted"
                                                fontWeight="medium"
                                              >
                                                Record result:
                                              </Text>
                                              <Button
                                                size="xs"
                                                colorPalette="green"
                                                variant="outline"
                                                onClick={() =>
                                                  handleRecordResult(
                                                    m._id,
                                                    m.player1.participantId,
                                                  )
                                                }
                                                loading={actionLoading}
                                              >
                                                <LuSwords /> {m.player1.name}{" "}
                                                wins
                                              </Button>
                                              <Button
                                                size="xs"
                                                colorPalette="green"
                                                variant="outline"
                                                onClick={() =>
                                                  handleRecordResult(
                                                    m._id,
                                                    m.player2.participantId,
                                                  )
                                                }
                                                loading={actionLoading}
                                              >
                                                <LuSwords /> {m.player2.name}{" "}
                                                wins
                                              </Button>
                                            </VStack>
                                          )}
                                        {isAdmin &&
                                          isActive &&
                                          m.status === "completed" && (
                                            <Button
                                              size="xs"
                                              colorPalette="orange"
                                              variant="outline"
                                              onClick={() => {
                                                setOverrideMatchId(m._id);
                                                setOverrideWinnerId("");
                                                setOverrideReason("");
                                              }}
                                            >
                                              <LuShieldAlert /> Override
                                            </Button>
                                          )}
                                      </HStack>

                                      {/* Participant report buttons */}
                                      {canParticipantReport && (
                                        <Box
                                          mt={3}
                                          pt={3}
                                          borderTopWidth={1}
                                          borderColor="border"
                                        >
                                          <VStack gap={2} alignItems="stretch">
                                            <Text
                                              fontSize="xs"
                                              color="fg.muted"
                                              fontWeight="medium"
                                            >
                                              {myReport
                                                ? "Change your reported winner:"
                                                : "Report match result:"}
                                            </Text>
                                            <HStack gap={2}>
                                              <Button
                                                size="xs"
                                                flex={1}
                                                colorPalette={
                                                  myReport?.winnerId ===
                                                  m.player1.participantId
                                                    ? "green"
                                                    : "gray"
                                                }
                                                variant={
                                                  myReport?.winnerId ===
                                                  m.player1.participantId
                                                    ? "solid"
                                                    : "outline"
                                                }
                                                onClick={() =>
                                                  handleReportResult(
                                                    m._id,
                                                    m.player1.participantId,
                                                  )
                                                }
                                                loading={actionLoading}
                                              >
                                                {m.player1.name} won
                                              </Button>
                                              <Button
                                                size="xs"
                                                flex={1}
                                                colorPalette={
                                                  myReport?.winnerId ===
                                                  m.player2.participantId
                                                    ? "green"
                                                    : "gray"
                                                }
                                                variant={
                                                  myReport?.winnerId ===
                                                  m.player2.participantId
                                                    ? "solid"
                                                    : "outline"
                                                }
                                                onClick={() =>
                                                  handleReportResult(
                                                    m._id,
                                                    m.player2.participantId,
                                                  )
                                                }
                                                loading={actionLoading}
                                              >
                                                {m.player2.name} won
                                              </Button>
                                            </HStack>
                                          </VStack>
                                        </Box>
                                      )}
                                      {!isAdmin &&
                                        (isP1 || isP2) &&
                                        m.status === "in_progress" &&
                                        myReport && (
                                          <Text
                                            fontSize="xs"
                                            color="blue.fg"
                                            mt={2}
                                            textAlign="center"
                                          >
                                            You reported{" "}
                                            <strong>
                                              {myReport.winnerId ===
                                              m.player1.participantId
                                                ? m.player1.name
                                                : m.player2.name}
                                            </strong>{" "}
                                            as winner — waiting for opponent
                                          </Text>
                                        )}
                                      {!isAdmin &&
                                        (isP1 || isP2) &&
                                        m.status === "disputed" && (
                                          <Text
                                            fontSize="xs"
                                            color="orange.fg"
                                            mt={2}
                                            textAlign="center"
                                            fontWeight="medium"
                                          >
                                            Result disputed — awaiting organiser
                                            decision
                                          </Text>
                                        )}

                                      {m.winnerId && (
                                        <Box
                                          mt={2}
                                          pt={2}
                                          borderTopWidth={1}
                                          borderColor="border"
                                        >
                                          <HStack
                                            gap={1}
                                            justifyContent="center"
                                          >
                                            <LuTrophy size={12} />
                                            <Text
                                              fontSize="xs"
                                              color="fg.muted"
                                              fontWeight="medium"
                                            >
                                              Winner:{" "}
                                              <strong>
                                                {m.winnerId ===
                                                m.player1.participantId
                                                  ? m.player1.name
                                                  : m.player2.name}
                                              </strong>
                                            </Text>
                                          </HStack>
                                        </Box>
                                      )}
                                      {isOverriding && (
                                        <Box
                                          mt={3}
                                          pt={3}
                                          borderTopWidth={1}
                                          borderColor="border"
                                        >
                                          <VStack gap={2} alignItems="stretch">
                                            <Text
                                              fontSize="sm"
                                              fontWeight="medium"
                                            >
                                              Override Result
                                            </Text>
                                            <HStack gap={2}>
                                              <Button
                                                size="xs"
                                                variant={
                                                  overrideWinnerId ===
                                                  m.player1.participantId
                                                    ? "solid"
                                                    : "outline"
                                                }
                                                colorPalette="blue"
                                                onClick={() =>
                                                  setOverrideWinnerId(
                                                    m.player1.participantId,
                                                  )
                                                }
                                              >
                                                {m.player1.name}
                                              </Button>
                                              <Button
                                                size="xs"
                                                variant={
                                                  overrideWinnerId ===
                                                  m.player2.participantId
                                                    ? "solid"
                                                    : "outline"
                                                }
                                                colorPalette="blue"
                                                onClick={() =>
                                                  setOverrideWinnerId(
                                                    m.player2.participantId,
                                                  )
                                                }
                                              >
                                                {m.player2.name}
                                              </Button>
                                            </HStack>
                                            <Input
                                              size="sm"
                                              placeholder="Reason (optional)"
                                              value={overrideReason}
                                              onChange={(
                                                e: React.ChangeEvent<HTMLInputElement>,
                                              ) =>
                                                setOverrideReason(
                                                  e.target.value,
                                                )
                                              }
                                            />
                                            <HStack gap={2}>
                                              <Button
                                                size="xs"
                                                colorPalette="orange"
                                                onClick={handleOverrideResult}
                                                loading={overrideLoading}
                                                disabled={!overrideWinnerId}
                                              >
                                                Confirm Override
                                              </Button>
                                              <Button
                                                size="xs"
                                                variant="ghost"
                                                onClick={() =>
                                                  setOverrideMatchId(null)
                                                }
                                              >
                                                Cancel
                                              </Button>
                                            </HStack>
                                            {m.resultOverrides.length > 0 && (
                                              <Text
                                                fontSize="xs"
                                                color="fg.muted"
                                              >
                                                {m.resultOverrides.length}{" "}
                                                previous override(s)
                                              </Text>
                                            )}
                                          </VStack>
                                        </Box>
                                      )}
                                    </Box>
                                  );
                                }}
                              </For>
                            </SimpleGrid>
                          </Box>
                        );
                      }}
                    </For>
                  </VStack>
                )}
              </Card.Body>
            </Card.Root>
          )}
        </SimpleGrid>

        {/* Edit participant dialog */}
        <Dialog.Root
          open={editDialogOpen}
          onOpenChange={(e: { open: boolean }) => {
            if (!e.open) {
              setEditDialogOpen(false);
              setEditingParticipant(null);
            }
          }}
        >
          <Portal>
            <Dialog.Backdrop />
            <Dialog.Positioner>
              <Dialog.Content maxWidth="400px" width="95%">
                <Dialog.Header
                  borderBottomWidth="1px"
                  borderColor={borderColor}
                >
                  <Dialog.Title>Edit Participant</Dialog.Title>
                </Dialog.Header>
                <Dialog.Body py={4}>
                  <VStack gap={4} align="stretch">
                    <Field.Root>
                      <Field.Label>Name</Field.Label>
                      <Input
                        value={editingParticipant?.name ?? ""}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setEditingParticipant((prev) =>
                            prev ? { ...prev, name: e.target.value } : prev,
                          )
                        }
                        autoFocus
                      />
                    </Field.Root>
                    <Field.Root>
                      <Field.Label>Faction</Field.Label>
                      <chakra.select
                        value={editingParticipant?.faction ?? ""}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                          setEditingParticipant((prev) =>
                            prev ? { ...prev, faction: e.target.value } : prev,
                          )
                        }
                        w="full"
                        borderRadius="md"
                        borderWidth="1px"
                        borderColor="border"
                        fontSize="sm"
                        color="fg"
                        p={2}
                      >
                        <option value="">No Faction</option>
                        {warhammer3Factions.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </chakra.select>
                    </Field.Root>
                  </VStack>
                </Dialog.Body>
                <Dialog.Footer
                  borderTopWidth="1px"
                  borderColor={borderColor}
                  gap={3}
                >
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditDialogOpen(false);
                      setEditingParticipant(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    colorPalette="blue"
                    onClick={handleUpdateParticipant}
                    loading={actionLoading}
                    disabled={!editingParticipant?.name?.trim()}
                  >
                    Save
                  </Button>
                </Dialog.Footer>
              </Dialog.Content>
            </Dialog.Positioner>
          </Portal>
        </Dialog.Root>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={8}>
      <HStack mb={6} justifyContent="space-between">
        <Heading as="h1" size="xl">
          Match Management
        </Heading>
        <Button variant="outline" size="sm" onClick={fetchTournaments}>
          Refresh
        </Button>
      </HStack>

      {error && (
        <Box
          mb={4}
          p={3}
          bg="red.subtle"
          borderRadius="md"
          borderWidth={1}
          borderColor="red.muted"
        >
          <Text color="red.600">{error}</Text>
        </Box>
      )}

      {tournaments.length === 0 ? (
        <Card.Root>
          <Card.Body py={16}>
            <VStack gap={4}>
              <Box opacity={0.3}>
                <LuTrophy size={48} />
              </Box>
              <Text color="fg.muted" fontSize="lg">
                {isAuthenticated()
                  ? "You haven't created or joined any tournaments yet."
                  : "Sign in to view your tournaments."}
              </Text>
              <Text color="fg.muted" fontSize="sm">
                {isAuthenticated() ? (
                  <>
                    Go to the <strong>Tournaments</strong> page to create or
                    join one.
                  </>
                ) : (
                  <Button
                    size="sm"
                    colorPalette="blue"
                    onClick={() => navigate("/login")}
                  >
                    Sign In
                  </Button>
                )}
              </Text>
            </VStack>
          </Card.Body>
        </Card.Root>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
          <For each={tournaments}>
            {(t) => (
              <Card.Root
                key={t._id}
                cursor="pointer"
                onClick={() => handleSelectTournament(t)}
                bg={cardBg}
                borderColor={borderColor}
                _hover={{ shadow: "md", bg: selectedBg }}
                transition="all 0.15s ease"
              >
                <Card.Body>
                  <VStack alignItems="flex-start" gap={2}>
                    <HStack justifyContent="space-between" width="full">
                      <Text fontWeight="semibold" fontSize="md" truncate>
                        {t.name}
                      </Text>
                      <Badge
                        colorPalette={statusColorMap[t.status]}
                        size="sm"
                        flexShrink={0}
                      >
                        {t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                      </Badge>
                    </HStack>
                    <Text fontSize="sm" color="fg.muted">
                      {t.tournamentType}
                    </Text>
                    <Separator />
                    <HStack gap={4} fontSize="sm" color="fg.muted">
                      <Text>
                        {t.participants.length}/{t.playerCount} players
                      </Text>
                      <Text>{new Date(t.createdAt).toLocaleDateString()}</Text>
                    </HStack>
                  </VStack>
                </Card.Body>
              </Card.Root>
            )}
          </For>
        </SimpleGrid>
      )}
    </Container>
  );
};

export default MatchesPage;
