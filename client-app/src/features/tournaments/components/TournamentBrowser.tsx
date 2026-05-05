import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Text,
  VStack,
  HStack,
  SimpleGrid,
  Card,
  Badge,
  Button,
  Spinner,
  Separator,
  For,
} from "@chakra-ui/react";
import { LuLogIn, LuEye, LuTrophy } from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import { httpClient } from "@/core/api/httpClient";
import { useUserStore } from "@/shared/stores/userStore";
import { useColorModeValue } from "@/shared/ui/ColorMode";

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

interface Tournament {
  _id: string;
  name: string;
  description: string;
  playerCount: number;
  tournamentType: string;
  bannedFactions: string[];
  participants: Participant[];
  status: "pending" | "active" | "completed";
  createdAt: string;
}

interface Props {
  statusFilter: "pending" | "active" | "completed";
  emptyMessage: string;
}

const TournamentBrowser: React.FC<Props> = ({ statusFilter, emptyMessage }) => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);

  const { user, isAuthenticated } = useUserStore();
  const navigate = useNavigate();
  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");

  const fetchTournaments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = (await httpClient.get(
        `/tournament?status=${statusFilter}`,
      )) as { success: boolean; data: Tournament[] };
      setTournaments(res.data ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load tournaments",
      );
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchTournaments();
  }, [fetchTournaments]);

  const handleJoin = async (tournament: Tournament) => {
    setJoiningId(tournament._id);
    setJoinError(null);
    setJoinSuccess(null);
    try {
      await httpClient.post(`/tournament/${tournament._id}/join`, {});
      setJoinSuccess(`You have joined "${tournament.name}"!`);
      await fetchTournaments();
    } catch (err) {
      setJoinError(
        err instanceof Error ? err.message : "Failed to join tournament",
      );
    } finally {
      setJoiningId(null);
    }
  };

  const isAlreadyJoined = (tournament: Tournament) => {
    const name = user?.username || user?.id;
    return tournament.participants.some((p) => p.name === name);
  };

  if (loading) {
    return (
      <VStack gap={4} py={8}>
        <Spinner />
        <Text color="fg.muted">Loading tournaments...</Text>
      </VStack>
    );
  }

  if (error) {
    return (
      <Box
        p={3}
        bg="red.subtle"
        borderRadius="md"
        borderWidth={1}
        borderColor="red.muted"
      >
        <Text color="red.600">{error}</Text>
      </Box>
    );
  }

  return (
    <VStack gap={4} alignItems="stretch">
      {joinError && (
        <Box
          p={3}
          bg="red.subtle"
          borderRadius="md"
          borderWidth={1}
          borderColor="red.muted"
        >
          <Text color="red.600">{joinError}</Text>
        </Box>
      )}
      {joinSuccess && (
        <Box
          p={3}
          bg="green.subtle"
          borderRadius="md"
          borderWidth={1}
          borderColor="green.muted"
        >
          <Text color="green.600">{joinSuccess}</Text>
        </Box>
      )}

      {tournaments.length === 0 ? (
        <Text color="fg.muted" py={8} textAlign="center">
          {emptyMessage}
        </Text>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
          <For each={tournaments}>
            {(t) => {
              const joined = isAlreadyJoined(t);
              const full = t.participants.length >= t.playerCount;
              const canJoin =
                isAuthenticated() && t.status === "pending" && !joined && !full;

              return (
                <Card.Root key={t._id} bg={cardBg} borderColor={borderColor}>
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
                      {t.description && (
                        <Text fontSize="sm" lineClamp={2}>
                          {t.description}
                        </Text>
                      )}
                      <Separator />
                      <HStack
                        gap={4}
                        fontSize="sm"
                        color="fg.muted"
                        width="full"
                        justifyContent="space-between"
                      >
                        <Text>
                          {t.participants.length}/{t.playerCount} players
                        </Text>
                        <Text>
                          {new Date(t.createdAt).toLocaleDateString()}
                        </Text>
                      </HStack>
                      {joined && (
                        <Badge
                          colorPalette={
                            t.status === "completed" ? "gray" : "blue"
                          }
                          variant="subtle"
                          width="full"
                          justifyContent="center"
                        >
                          {t.status === "completed" ? "Participated" : "Joined"}
                        </Badge>
                      )}
                      {full && !joined && t.status === "pending" && (
                        <Badge
                          colorPalette="orange"
                          variant="subtle"
                          width="full"
                          justifyContent="center"
                        >
                          Full
                        </Badge>
                      )}
                      {canJoin && (
                        <Button
                          width="full"
                          colorPalette="blue"
                          size="sm"
                          onClick={() => handleJoin(t)}
                          loading={joiningId === t._id}
                        >
                          <LuLogIn />
                          Join Tournament
                        </Button>
                      )}
                      {!isAuthenticated() &&
                        t.status === "pending" &&
                        !full && (
                          <Text
                            fontSize="xs"
                            color="fg.muted"
                            textAlign="center"
                            width="full"
                          >
                            Sign In to Join
                          </Text>
                        )}
                      <Button
                        width="full"
                        variant="outline"
                        size="sm"
                        colorPalette={
                          t.status === "completed" ? "gray" : undefined
                        }
                        onClick={() => navigate(`/tournament/${t._id}`)}
                      >
                        {t.status === "completed" ? <LuTrophy /> : <LuEye />}
                        {t.status === "completed" ? "View Results" : "Spectate"}
                      </Button>
                    </VStack>
                  </Card.Body>
                </Card.Root>
              );
            }}
          </For>
        </SimpleGrid>
      )}
    </VStack>
  );
};

export default TournamentBrowser;
