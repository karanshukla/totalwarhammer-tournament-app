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
import { LuLogIn, LuEye, LuTrophy, LuSwords } from "react-icons/lu";
import { useNavigate } from "react-router";
import { httpClient } from "@/core/api/httpClient";
import { useUserStore } from "@/shared/stores/userStore";

const statusColorMap: Record<string, string> = {
  pending: "ink",
  active: "verdigris",
  completed: "ink",
};

const statusAccentMap: Record<string, string> = {
  pending: "status.pending.border",
  active: "info.border",
  completed: "gold.border",
};

const statusBarMap: Record<string, string> = {
  pending: "status.pending.border",
  active: "info.border",
  completed: "border.emphasized",
};

interface Participant {
  _id: string;
  userId?: string | null;
  name: string;
  faction: string;
}

interface Tournament {
  _id: string;
  code?: string;
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
    "pending" | "active" | "completed" | ("pending" | "active" | "completed")[];
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
    if (!user) return false;
    const uid = user.id;
    const name = user.username || uid;
    return tournament.participants.some((p) => {
      if (p.userId) return p.userId === uid;
      return p.name === name;
    });
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
        bg="status.loss.subtle"
        borderRadius="md"
        borderWidth={1}
        borderColor="status.loss.border"
      >
        <Text color="status.loss">{error}</Text>
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

              const fillPct = Math.round(
                (t.participants.length / t.playerCount) * 100,
              );

              return (
                <Card.Root
                  key={t._id}
                  bg={cardBg}
                  borderColor={borderColor}
                  borderTopColor={statusAccentMap[t.status]}
                  borderTopWidth="2px"
                  display="flex"
                  flexDirection="column"
                  transition="all 0.15s ease"
                  _hover={{ borderColor: "border.emphasized", shadow: "md" }}
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
                            size="xs"
                            variant="subtle"
                            bg="gold.subtle"
                            color="gold.text"
                          >
                            40K
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
                      <Box width="full" pt={1}>
                        <HStack
                          justifyContent="space-between"
                          fontSize="xs"
                          color="fg.muted"
                          mb={1}
                        >
                          <Text>
                            {t.participants.length}/{t.playerCount} players
                          </Text>
                          <Text>
                            {new Date(t.createdAt).toLocaleDateString()}
                          </Text>
                        </HStack>
                        <Box
                          bg="bg.muted"
                          borderRadius="full"
                          h="3px"
                          w="full"
                          overflow="hidden"
                        >
                          <Box
                            bg={statusBarMap[t.status]}
                            h="100%"
                            w={`${fillPct}%`}
                          />
                        </Box>
                      </Box>
                    </VStack>
                  </Card.Body>
                  <Card.Footer pt={0} flexDirection="column" gap={2}>
                    {joined && (
                      <Badge
                        colorPalette={
                          t.status === "completed" ? "ink" : "verdigris"
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
                        colorPalette="ink"
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
                        colorPalette="crimson"
                        size="sm"
                        onClick={() =>
                          navigate(
                            t.code
                              ? `/matches/spectate/${t.code}`
                              : `/tournament/${t._id}`,
                          )
                        }
                      >
                        <LuLogIn />
                        Join Tournament
                      </Button>
                    )}
                    {!isAuthenticated() && t.status === "pending" && !full && (
                      <HStack
                        width="full"
                        justifyContent="center"
                        gap={1}
                        py={1}
                      >
                        <Box color="fg.muted" display="inline-flex">
                          <LuLogIn size={12} />
                        </Box>
                        <Text fontSize="xs" color="fg.muted">
                          Sign in to join
                        </Text>
                      </HStack>
                    )}
                    {joined ? (
                      <Button
                        width="full"
                        variant="outline"
                        size="sm"
                        colorPalette="verdigris"
                        onClick={() =>
                          navigate(
                            t.code
                              ? `/matches/tournament/${t.code}`
                              : `/matches#${t._id}`,
                          )
                        }
                      >
                        <LuSwords />
                        My Matches
                      </Button>
                    ) : (
                      <Button
                        width="full"
                        variant="outline"
                        size="sm"
                        colorPalette="verdigris"
                        onClick={() =>
                          navigate(
                            t.code
                              ? `/matches/spectate/${t.code}`
                              : `/tournament/${t._id}`,
                          )
                        }
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
