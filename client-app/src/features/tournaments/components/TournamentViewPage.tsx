import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  Spinner,
  Separator,
  For,
  Input,
  Field,
  chakra,
} from "@chakra-ui/react";
import {
  LuChevronLeft,
  LuLogIn,
  LuEye,
  LuUsers,
  LuSwords,
  LuTrophy,
  LuSettings,
} from "react-icons/lu";
import { httpClient } from "@/core/api/httpClient";
import { useUserStore } from "@/shared/stores/userStore";
import { useColorModeValue } from "@/shared/ui/ColorMode";

const warhammer3Factions = [
  "Empire",
  "Dwarfs",
  "Greenskins",
  "Vampire Counts",
  "Warriors of Chaos",
  "Beastmen",
  "Wood Elves",
  "Bretonnia",
  "Norsca",
  "High Elves",
  "Dark Elves",
  "Lizardmen",
  "Skaven",
  "Tomb Kings",
  "Vampire Coast",
  "Kislev",
  "Cathay",
  "Ogre Kingdoms",
  "Daemons of Chaos Undivided",
  "Khorne",
  "Nurgle",
  "Slaanesh",
  "Tzeentch",
  "Chaos Dwarfs",
];

const statusColorMap: Record<string, string> = {
  pending: "yellow",
  active: "green",
  completed: "gray",
};

interface Participant {
  _id: string;
  name: string;
  faction: string;
}

interface ReportedResult {
  reportedBy: string;
  reportedByName: string;
  winnerId: string;
}

interface Match {
  _id: string;
  round: number;
  matchNumber: number;
  player1: { participantId: string; name: string; faction: string };
  player2: { participantId: string; name: string; faction: string };
  winnerId: string | null;
  status: "pending" | "in_progress" | "completed" | "disputed";
  reportedResults: ReportedResult[];
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

const TournamentViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useUserStore();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joinFaction, setJoinFaction] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState(false);

  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const mutedBg = useColorModeValue("gray.50", "gray.900");

  const fetchTournament = useCallback(
    async (silent = false) => {
      if (!id) return;
      if (!silent) setLoading(true);
      setError(null);
      try {
        const res = (await httpClient.get(`/tournament/${id}`)) as {
          success: boolean;
          data: Tournament;
        };
        setTournament(res.data);

        if (res.data.status === "active" || res.data.status === "completed") {
          try {
            const mRes = (await httpClient.get(`/match/tournament/${id}`)) as {
              success: boolean;
              data: Match[];
            };
            setMatches(mRes.data ?? []);
          } catch {
            setMatches([]);
          }
        }
      } catch {
        if (!silent) setError("Tournament not found or could not be loaded.");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    fetchTournament();
  }, [fetchTournament]);

  const tournamentStatus = tournament?.status;
  useEffect(() => {
    if (!tournamentStatus || tournamentStatus === "completed") return;
    const interval = setInterval(() => fetchTournament(true), 5000);
    return () => clearInterval(interval);
  }, [fetchTournament, tournamentStatus]);

  const handleJoin = async () => {
    if (!tournament) return;
    setJoining(true);
    setJoinError(null);
    try {
      await httpClient.post(`/tournament/${tournament._id}/join`, {
        faction: joinFaction,
      });
      setJoinSuccess(true);
      await fetchTournament();
    } catch (err) {
      setJoinError(
        err instanceof Error ? err.message : "Failed to join tournament",
      );
    } finally {
      setJoining(false);
    }
  };

  const isAlreadyJoined = () => {
    if (!tournament || !user) return false;
    const name = user.username || user.id;
    return tournament.participants.some((p) => p.name === name);
  };

  if (loading) {
    return (
      <Container maxW="container.xl" py={16}>
        <VStack gap={4}>
          <Spinner size="xl" />
          <Text color="fg.muted">Loading tournament...</Text>
        </VStack>
      </Container>
    );
  }

  if (error || !tournament) {
    return (
      <Container maxW="container.xl" py={8}>
        <VStack gap={4} py={16} alignItems="center">
          <Text fontSize="xl" fontWeight="bold">
            Tournament Not Found
          </Text>
          <Text color="fg.muted">{error}</Text>
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <LuChevronLeft /> Go Back
          </Button>
        </VStack>
      </Container>
    );
  }

  const isFull = tournament.participants.length >= tournament.playerCount;
  const isPending = tournament.status === "pending";
  const isActive = tournament.status === "active";
  const alreadyJoined = isAlreadyJoined();
  const isOwner = !!user && tournament.createdBy === user.id;
  const canJoin =
    isAuthenticated() &&
    isPending &&
    !alreadyJoined &&
    !isFull &&
    !joinSuccess &&
    !isOwner;
  const roundNumbers = [...new Set(matches.map((m) => m.round))].sort(
    (a, b) => a - b,
  );

  const champion = (() => {
    if (tournament.status !== "completed" || matches.length === 0) return null;
    const finalRound = Math.max(...matches.map((m) => m.round));
    const finalMatches = matches.filter(
      (m) => m.round === finalRound && m.winnerId,
    );
    if (finalMatches.length === 0) return null;
    const finalMatch = finalMatches[finalMatches.length - 1];
    if (finalMatch.winnerId === finalMatch.player1.participantId)
      return finalMatch.player1;
    if (finalMatch.winnerId === finalMatch.player2.participantId)
      return finalMatch.player2;
    return null;
  })();

  return (
    <Container maxW="container.xl" py={8}>
      {/* Back */}
      <Button variant="ghost" size="sm" mb={6} onClick={() => navigate(-1)}>
        <LuChevronLeft /> Back
      </Button>

      {/* Champion Banner */}
      {champion && (
        <Box
          mb={6}
          p={5}
          borderRadius="lg"
          bg="yellow.subtle"
          borderWidth={1}
          borderColor="yellow.muted"
          textAlign="center"
        >
          <HStack justifyContent="center" gap={3}>
            <LuTrophy size={24} color="var(--chakra-colors-yellow-500)" />
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
            <LuTrophy size={24} color="var(--chakra-colors-yellow-500)" />
          </HStack>
        </Box>
      )}

      {/* Header */}
      <HStack mb={6} gap={4} wrap="wrap" alignItems="flex-start">
        <VStack alignItems="flex-start" gap={1} flex={1}>
          <HStack gap={3} wrap="wrap">
            <Heading as="h1" size="xl">
              {tournament.name}
            </Heading>
            <Badge colorPalette={statusColorMap[tournament.status]} size="lg">
              {tournament.status.charAt(0).toUpperCase() +
                tournament.status.slice(1)}
            </Badge>
            {isOwner ? (
              <Badge variant="outline" size="sm" colorPalette="blue">
                <LuSettings />
                Owner
              </Badge>
            ) : (
              <Badge variant="outline" size="sm" colorPalette="gray">
                <LuEye />
                Spectating
              </Badge>
            )}
          </HStack>
          <HStack gap={3} color="fg.muted" fontSize="sm">
            <Text>{tournament.tournamentType}</Text>
            <Text>·</Text>
            <Text>
              {tournament.participants.length}/{tournament.playerCount} players
            </Text>
            <Text>·</Text>
            <Text fontFamily="mono" fontWeight="bold" letterSpacing="wider">
              Code: {tournament.code}
            </Text>
          </HStack>
          {tournament.description && (
            <Text mt={1}>{tournament.description}</Text>
          )}
        </VStack>
        {isOwner && (
          <Button
            colorPalette="blue"
            size="sm"
            alignSelf="flex-start"
            onClick={() => navigate(`/matches#${tournament._id}`)}
          >
            <LuSettings />
            Manage Tournament
          </Button>
        )}
      </HStack>

      <SimpleGrid
        columns={{
          base: 1,
          lg: canJoin || (isAuthenticated() && isPending) ? 3 : 2,
        }}
        gap={6}
      >
        {/* Participants */}
        <Card.Root bg={cardBg}>
          <Card.Header>
            <HStack gap={2}>
              <LuUsers />
              <Heading size="md">
                Participants ({tournament.participants.length}/
                {tournament.playerCount})
              </Heading>
            </HStack>
          </Card.Header>
          <Card.Body>
            {tournament.participants.length === 0 ? (
              <Text color="fg.muted" textAlign="center" py={4}>
                No participants yet
              </Text>
            ) : (
              <VStack gap={2} alignItems="stretch">
                <For each={tournament.participants}>
                  {(p) => (
                    <HStack
                      key={p._id}
                      p={3}
                      borderRadius="md"
                      borderWidth={1}
                      borderColor={borderColor}
                      bg={mutedBg}
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
                      {alreadyJoined &&
                        (user?.username === p.name || user?.id === p.name) && (
                          <Badge colorPalette="blue" size="sm">
                            You
                          </Badge>
                        )}
                    </HStack>
                  )}
                </For>
              </VStack>
            )}
          </Card.Body>
        </Card.Root>

        {/* Tournament Info */}
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
                <Text fontWeight="medium">{tournament.tournamentType}</Text>
              </HStack>
              <Separator />
              <HStack justifyContent="space-between">
                <Text color="fg.muted" fontSize="sm">
                  Players
                </Text>
                <Text fontWeight="medium">
                  {tournament.participants.length}/{tournament.playerCount}
                </Text>
              </HStack>
              <Separator />
              <HStack justifyContent="space-between">
                <Text color="fg.muted" fontSize="sm">
                  Status
                </Text>
                <Badge colorPalette={statusColorMap[tournament.status]}>
                  {tournament.status.charAt(0).toUpperCase() +
                    tournament.status.slice(1)}
                </Badge>
              </HStack>
              <Separator />
              <HStack justifyContent="space-between">
                <Text color="fg.muted" fontSize="sm">
                  Created
                </Text>
                <Text fontSize="sm">
                  {new Date(tournament.createdAt).toLocaleDateString()}
                </Text>
              </HStack>
              {tournament.bannedFactions.length > 0 && (
                <>
                  <Separator />
                  <VStack alignItems="flex-start" gap={1}>
                    <Text color="fg.muted" fontSize="sm">
                      Banned Factions
                    </Text>
                    <HStack wrap="wrap" gap={1}>
                      <For each={tournament.bannedFactions}>
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

        {/* Join panel — only shown when pending and user can/could join */}
        {isPending && (
          <Card.Root bg={cardBg}>
            <Card.Header>
              <HStack gap={2}>
                <LuLogIn />
                <Heading size="md">
                  {alreadyJoined || joinSuccess
                    ? "You're In!"
                    : "Join Tournament"}
                </Heading>
              </HStack>
            </Card.Header>
            <Card.Body>
              {alreadyJoined || joinSuccess ? (
                <VStack gap={2} py={4} alignItems="center">
                  <Badge colorPalette="green" size="lg" px={4} py={2}>
                    Registered
                  </Badge>
                  <Text fontSize="sm" color="fg.muted" textAlign="center">
                    You are registered for this tournament.
                  </Text>
                </VStack>
              ) : isFull ? (
                <Text color="fg.muted" textAlign="center" py={4}>
                  This tournament is full.
                </Text>
              ) : !isAuthenticated() ? (
                <Text color="fg.muted" textAlign="center" py={4}>
                  Sign In to Join This Tournament.
                </Text>
              ) : (
                <VStack gap={4}>
                  {joinError && (
                    <Box
                      p={3}
                      bg="red.subtle"
                      borderRadius="md"
                      borderWidth={1}
                      borderColor="red.muted"
                      width="full"
                    >
                      <Text color="red.600" fontSize="sm">
                        {joinError}
                      </Text>
                    </Box>
                  )}
                  <Field.Root>
                    <Field.Label fontSize="sm">
                      Faction{" "}
                      <Text as="span" color="fg.muted">
                        (optional)
                      </Text>
                    </Field.Label>
                    <chakra.select
                      value={joinFaction}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        setJoinFaction(e.target.value)
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
                      {warhammer3Factions
                        .filter((f) => !tournament.bannedFactions.includes(f))
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
                    onClick={handleJoin}
                    loading={joining}
                  >
                    <LuLogIn />
                    Join Tournament
                  </Button>
                </VStack>
              )}
            </Card.Body>
          </Card.Root>
        )}

        {/* Matches — active/completed */}
        {(isActive || tournament.status === "completed") && (
          <Card.Root gridColumn={{ lg: "1 / -1" }} bg={cardBg}>
            <Card.Header>
              <HStack gap={2}>
                <LuSwords />
                <Heading size="md">Matches</Heading>
              </HStack>
            </Card.Header>
            <Card.Body>
              {matches.length === 0 ? (
                <Text color="fg.muted" textAlign="center" py={4}>
                  No matches yet.
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
                        <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
                          <For each={matches.filter((m) => m.round === round)}>
                            {(m) => {
                              const p1Won =
                                m.winnerId === m.player1.participantId;
                              const p2Won =
                                m.winnerId === m.player2.participantId;
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
                                  <HStack mb={2} justifyContent="space-between">
                                    <Text fontSize="xs" color="fg.subtle">
                                      Match {m.matchNumber}
                                    </Text>
                                    {m.status === "completed" && (
                                      <Badge
                                        colorPalette="green"
                                        size="sm"
                                        variant="subtle"
                                      >
                                        Completed
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
                                        In Progress
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
                                          <Badge colorPalette="green" size="sm">
                                            W
                                          </Badge>
                                        )}
                                        {m.winnerId && !p1Won && (
                                          <Badge colorPalette="red" size="sm">
                                            L
                                          </Badge>
                                        )}
                                        <Text
                                          fontWeight={p1Won ? "bold" : "medium"}
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
                                    <Text color="fg.muted" fontWeight="bold">
                                      vs
                                    </Text>
                                    <VStack
                                      alignItems="flex-end"
                                      gap={0}
                                      flex={1}
                                    >
                                      <HStack gap={1}>
                                        {p2Won && (
                                          <Badge colorPalette="green" size="sm">
                                            W
                                          </Badge>
                                        )}
                                        {m.winnerId && !p2Won && (
                                          <Badge colorPalette="red" size="sm">
                                            L
                                          </Badge>
                                        )}
                                        <Text
                                          fontWeight={p2Won ? "bold" : "medium"}
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
                                  </HStack>
                                  {m.winnerId && (
                                    <Box
                                      mt={2}
                                      pt={2}
                                      borderTopWidth={1}
                                      borderColor="border"
                                    >
                                      <Text
                                        fontSize="xs"
                                        color="fg.muted"
                                        textAlign="center"
                                      >
                                        Winner:{" "}
                                        <strong>
                                          {m.winnerId ===
                                          m.player1.participantId
                                            ? m.player1.name
                                            : m.player2.name}
                                        </strong>
                                      </Text>
                                    </Box>
                                  )}
                                  {m.status === "disputed" && (
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
                                </Box>
                              );
                            }}
                          </For>
                        </SimpleGrid>
                      </Box>
                    )}
                  </For>
                </VStack>
              )}
            </Card.Body>
          </Card.Root>
        )}
      </SimpleGrid>
    </Container>
  );
};

export default TournamentViewPage;
