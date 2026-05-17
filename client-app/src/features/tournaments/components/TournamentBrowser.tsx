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
import {
  LuLogIn,
  LuEye,
  LuTrophy,
  LuSwords,
  LuFlaskConical,
} from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import { httpClient } from "@/core/api/httpClient";
import { useUserStore } from "@/shared/stores/userStore";

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
  enable40kFactions?: boolean;
  participants: Participant[];
  status: "pending" | "active" | "completed";
  createdAt: string;
}

interface Props {
  statusFilter:
    | "pending"
    | "active"
    | "completed"
    | ("pending" | "active" | "completed")[];
  emptyMessage: string;
}

const TournamentBrowser: React.FC<Props> = ({ statusFilter, emptyMessage }) => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user, isAuthenticated } = useUserStore();
  const navigate = useNavigate();
  const cardBg = "bg.panel";
  const borderColor = "border";

  const fetchTournaments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const statusParam = Array.isArray(statusFilter)
        ? statusFilter.join(",")
        : statusFilter;
      const res = (await httpClient.get(
        `/tournament?status=${statusParam}`,
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
        <Text color="red.fg">{error}</Text>
      </Box>
    );
  }

  return (
    <VStack gap={4} alignItems="stretch">
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
              const canView = t.status === "pending" && canJoin;

              return (
                <Card.Root
                  key={t._id}
                  bg={cardBg}
                  borderColor={borderColor}
                  display="flex"
                  flexDirection="column"
                >
                  <Card.Body flex={1}>
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
                      <HStack gap={2} alignItems="center">
                        <Text fontSize="sm" color="fg.muted">
                          {t.tournamentType}
                        </Text>
                        {t.enable40kFactions && (
                          <Badge
                            colorPalette="purple"
                            size="xs"
                            variant="subtle"
                          >
                            <LuFlaskConical size={9} />
                            40K Beta
                          </Badge>
                        )}
                      </HStack>
                      {t.description && (
                        <Text fontSize="sm" lineClamp={2} color="fg.muted">
                          {t.description
                            .replace(/!\[.*?\]\(.*?\)/g, "")
                            .replace(/\[([^\]]+)\]\(.*?\)/g, "$1")
                            .replace(/#{1,6}\s/g, "")
                            .replace(/[*_`~>]/g, "")
                            .replace(/\n+/g, " ")
                            .trim()}
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
                    </VStack>
                  </Card.Body>
                  <Card.Footer pt={0} flexDirection="column" gap={2}>
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
                    {canView && (
                      <Button
                        width="full"
                        colorPalette="blue"
                        size="sm"
                        onClick={() => navigate(`/tournament/${t._id}`)}
                      >
                        <LuLogIn />
                        Join Tournament
                      </Button>
                    )}
                    {!isAuthenticated() && t.status === "pending" && !full && (
                      <Text
                        fontSize="xs"
                        color="fg.muted"
                        textAlign="center"
                        width="full"
                      >
                        Sign In to Join
                      </Text>
                    )}
                    {joined ? (
                      <Button
                        width="full"
                        variant="outline"
                        size="sm"
                        colorPalette="blue"
                        onClick={() => navigate(`/matches#${t._id}`)}
                      >
                        <LuSwords />
                        Matches
                      </Button>
                    ) : (
                      <Button
                        width="full"
                        variant="outline"
                        size="sm"
                        colorPalette={
                          t.status === "completed" ? "gray" : undefined
                        }
                        onClick={() => navigate(`/matches/spectate/${t._id}`)}
                      >
                        {t.status === "completed" ? <LuTrophy /> : <LuEye />}
                        {t.status === "completed" ? "View Results" : "Spectate"}
                      </Button>
                    )}
                  </Card.Footer>
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
