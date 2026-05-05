import React, { useState, useEffect, useCallback } from "react";
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
} from "@chakra-ui/react";
import {
  LuTrophy,
  LuTrash2,
  LuPlay,
  LuUserPlus,
  LuX,
  LuChevronLeft,
  LuSwords,
  LuShieldAlert,
  LuCopy,
  LuEye,
} from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import { httpClient } from "@/core/api/httpClient";
import { useColorModeValue } from "@/shared/ui/ColorMode";

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
  status: "pending" | "in_progress" | "completed";
  notes: string;
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

  const [newName, setNewName] = useState("");
  const [newFaction, setNewFaction] = useState("");

  const [matches, setMatches] = useState<Match[]>([]);
  const [matchLoading, setMatchLoading] = useState(false);
  const [overrideMatchId, setOverrideMatchId] = useState<string | null>(null);
  const [overrideWinnerId, setOverrideWinnerId] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideLoading, setOverrideLoading] = useState(false);

  const navigate = useNavigate();
  const [codeCopied, setCodeCopied] = useState(false);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const selectedBg = useColorModeValue("blue.50", "blue.900");

  const fetchTournaments = useCallback(async () => {
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
  }, []);

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
      if (t.status === "active" || t.status === "completed") {
        await fetchMatches(t._id);
      } else {
        setMatches([]);
      }
    },
    [fetchMatches],
  );

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
    const canStart =
      selected.status === "pending" && selected.participants.length >= 2;
    const isPending = selected.status === "pending";
    const isActive = selected.status === "active";

    const roundNumbers = [...new Set(matches.map((m) => m.round))].sort(
      (a, b) => a - b,
    );

    return (
      <Container maxW="container.xl" py={8}>
        <HStack mb={6} gap={3}>
          <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
            <LuChevronLeft />
            Matches
          </Button>
        </HStack>

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
            <Text color="fg.muted">
              {selected.tournamentType} · Max {selected.playerCount} players
            </Text>
            {selected.code && (
              <HStack gap={2} mt={1}>
                <Text fontSize="sm" color="fg.muted">
                  Code:
                </Text>
                <Text
                  fontSize="sm"
                  fontFamily="mono"
                  fontWeight="bold"
                  letterSpacing="wider"
                >
                  {selected.code}
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
                <Button
                  size="xs"
                  variant="ghost"
                  colorPalette="blue"
                  onClick={() => navigate(`/tournament/${selected._id}`)}
                >
                  <LuEye />
                  Spectator View
                </Button>
              </HStack>
            )}
            {selected.description && <Text mt={1}>{selected.description}</Text>}
          </VStack>

          <HStack gap={2}>
            {canStart && (
              <Button
                colorPalette="green"
                onClick={handleStart}
                loading={actionLoading}
              >
                <LuPlay />
                Start Tournament
              </Button>
            )}
            {isPending && (
              <Button
                colorPalette="red"
                variant="outline"
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
            mb={4}
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
          {/* Participants list */}
          <Card.Root>
            <Card.Header>
              <Heading size="md">
                Participants ({selected.participants.length}/
                {selected.playerCount})
              </Heading>
            </Card.Header>
            <Card.Body>
              {selected.participants.length === 0 ? (
                <Text color="fg.muted" py={4} textAlign="center">
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
                        bg={cardBg}
                        justifyContent="space-between"
                      >
                        <VStack alignItems="flex-start" gap={0}>
                          <Text fontWeight="medium">{p.name}</Text>
                          {p.faction && (
                            <Text fontSize="sm" color="fg.muted">
                              {p.faction}
                            </Text>
                          )}
                        </VStack>
                        {isPending && (
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
                    )}
                  </For>
                </VStack>
              )}
            </Card.Body>
          </Card.Root>

          {/* Add participant */}
          {isPending && (
            <Card.Root>
              <Card.Header>
                <Heading size="md">Add Participant</Heading>
                {isFull && (
                  <Text fontSize="sm" color="orange.500" mt={1}>
                    Tournament is full ({selected.playerCount}/
                    {selected.playerCount})
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
                    <select
                      value={newFaction}
                      onChange={(e) => setNewFaction(e.target.value)}
                      disabled={isFull}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        border: `1px solid`,
                        fontSize: "14px",
                        background: "transparent",
                      }}
                    >
                      <option value="">No Faction</option>
                      {warhammer3Factions
                        .filter((f) => !selected.bannedFactions.includes(f))
                        .map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                    </select>
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
          )}

          {/* Matches panel */}
          {(isActive || selected.status === "completed") && (
            <Card.Root gridColumn={{ lg: "1 / -1" }}>
              <Card.Header>
                <HStack justifyContent="space-between">
                  <Heading size="md">Matches</Heading>
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
                      {(round) => (
                        <Box key={round}>
                          <Text
                            fontWeight="semibold"
                            mb={3}
                            fontSize="sm"
                            color="fg.muted"
                            textTransform="uppercase"
                            letterSpacing="wider"
                          >
                            Round {round}
                          </Text>
                          <VStack gap={3} alignItems="stretch">
                            <For
                              each={matches.filter((m) => m.round === round)}
                            >
                              {(m) => {
                                const p1Won =
                                  m.winnerId === m.player1.participantId;
                                const p2Won =
                                  m.winnerId === m.player2.participantId;
                                const isOverriding = overrideMatchId === m._id;
                                return (
                                  <Box
                                    key={m._id}
                                    p={4}
                                    borderRadius="md"
                                    borderWidth={1}
                                    borderColor={borderColor}
                                    bg={cardBg}
                                  >
                                    <HStack
                                      gap={4}
                                      wrap="wrap"
                                      justifyContent="space-between"
                                    >
                                      {/* Player 1 */}
                                      <VStack
                                        alignItems="flex-start"
                                        gap={0}
                                        flex={1}
                                      >
                                        <HStack gap={2}>
                                          {p1Won && (
                                            <Badge
                                              colorPalette="green"
                                              size="sm"
                                            >
                                              Winner
                                            </Badge>
                                          )}
                                          {m.winnerId && !p1Won && (
                                            <Badge colorPalette="red" size="sm">
                                              Lost
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
                                          <Text fontSize="xs" color="fg.muted">
                                            {m.player1.faction}
                                          </Text>
                                        )}
                                      </VStack>

                                      <Text
                                        color="fg.muted"
                                        fontWeight="bold"
                                        fontSize="lg"
                                      >
                                        vs
                                      </Text>

                                      {/* Player 2 */}
                                      <VStack
                                        alignItems="flex-end"
                                        gap={0}
                                        flex={1}
                                      >
                                        <HStack gap={2}>
                                          {p2Won && (
                                            <Badge
                                              colorPalette="green"
                                              size="sm"
                                            >
                                              Winner
                                            </Badge>
                                          )}
                                          {m.winnerId && !p2Won && (
                                            <Badge colorPalette="red" size="sm">
                                              Lost
                                            </Badge>
                                          )}
                                          <Text
                                            fontWeight={
                                              p2Won ? "bold" : "medium"
                                            }
                                          >
                                            {m.player2.name}
                                          </Text>
                                        </HStack>
                                        {m.player2.faction && (
                                          <Text fontSize="xs" color="fg.muted">
                                            {m.player2.faction}
                                          </Text>
                                        )}
                                      </VStack>

                                      {/* Controls */}
                                      {isActive && m.status !== "completed" && (
                                        <VStack gap={2} flexShrink={0}>
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
                                            <LuSwords /> {m.player1.name} wins
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
                                            <LuSwords /> {m.player2.name} wins
                                          </Button>
                                        </VStack>
                                      )}
                                      {isActive && m.status === "completed" && (
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

                                    {/* Override form */}
                                    {isOverriding && (
                                      <Box
                                        mt={3}
                                        pt={3}
                                        borderTopWidth={1}
                                        borderColor={borderColor}
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
                                              setOverrideReason(e.target.value)
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
                          </VStack>
                        </Box>
                      )}
                    </For>
                  </VStack>
                )}
              </Card.Body>
            </Card.Root>
          )}

          {/* Banned factions info */}
          {selected.bannedFactions.length > 0 && (
            <Card.Root>
              <Card.Header>
                <Heading size="md">Banned Factions</Heading>
              </Card.Header>
              <Card.Body>
                <HStack gap={2} wrap="wrap">
                  <For each={selected.bannedFactions}>
                    {(f) => (
                      <Badge key={f} colorPalette="red" variant="subtle">
                        {f}
                      </Badge>
                    )}
                  </For>
                </HStack>
              </Card.Body>
            </Card.Root>
          )}
        </SimpleGrid>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={8}>
      <HStack mb={6} justifyContent="space-between">
        <Heading as="h1" size="xl">
          My Tournaments
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
                You haven't created any tournaments yet.
              </Text>
              <Text color="fg.muted" fontSize="sm">
                Go to the <strong>Tournaments</strong> page to create one.
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
                        {t.status}
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
