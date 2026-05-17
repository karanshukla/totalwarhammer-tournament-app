import React, { useEffect, useState } from "react";
import {
  Container,
  Heading,
  Text,
  SimpleGrid,
  VStack,
  HStack,
  Box,
  Badge,
  Spinner,
  Card,
  Separator,
  For,
} from "@chakra-ui/react";
import {
  LuTrophy,
  LuSwords,
  LuShield,
  LuUsers,
  LuClock,
  LuCircleCheck,
} from "react-icons/lu";
import { httpClient } from "@/core/api/httpClient";
import { displayName as dn } from "@/shared/utils/displayName";

interface TopPlayer {
  name: string;
  wins: number;
  factions: string[];
}

interface TopFaction {
  faction: string;
  wins: number;
}

interface TopCreator {
  username: string;
  tournamentsCreated: number;
  completed: number;
}

interface RecentWinner {
  tournamentName: string;
  tournamentType: string;
  winnerName: string;
  winnerFaction: string;
  completedAt: string;
}

interface RecentTournament {
  _id: string;
  name: string;
  tournamentType: string;
  participants: { name: string; faction: string }[];
  playerCount: number;
  createdAt: string;
}

interface Stats {
  cachedAt?: string;
  tournaments: {
    pending: number;
    active: number;
    completed: number;
    total: number;
  };
  matches: {
    pending: number;
    in_progress: number;
    completed: number;
    disputed: number;
    total: number;
    completionRate: number;
  };
  topPlayers: TopPlayer[];
  topFactions: TopFaction[];
  topCreators: TopCreator[];
  recentTournaments: RecentTournament[];
  recentWinners: RecentWinner[];
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  colorPalette?: string;
  sub?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  colorPalette = "blue",
  sub,
}) => {
  const bg = "bg.panel";
  return (
    <Card.Root bg={bg}>
      <Card.Body>
        <HStack gap={4}>
          <Box
            p={3}
            borderRadius="lg"
            bg={`${colorPalette}.subtle`}
            color={`${colorPalette}.fg`}
            fontSize="xl"
          >
            {icon}
          </Box>
          <VStack alignItems="flex-start" gap={0}>
            <Text fontSize="2xl" fontWeight="bold" lineHeight="1">
              {value}
            </Text>
            <Text fontSize="sm" color="fg.muted">
              {label}
            </Text>
            {sub && (
              <Text fontSize="xs" color="fg.subtle">
                {sub}
              </Text>
            )}
          </VStack>
        </HStack>
      </Card.Body>
    </Card.Root>
  );
};

const StatisticsPage: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cardBg = "bg.panel";
  const barBg = "bg.muted";

  useEffect(() => {
    const load = async () => {
      try {
        const res = (await httpClient.get("/stats")) as {
          success: boolean;
          data: Stats;
        };
        setStats(res.data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load statistics",
        );
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <Container maxW="container.xl" py={16}>
        <VStack gap={4}>
          <Spinner size="xl" />
          <Text color="fg.muted">Loading statistics…</Text>
        </VStack>
      </Container>
    );
  }

  if (error || !stats) {
    return (
      <Container maxW="container.xl" py={8}>
        <Box
          p={4}
          bg="red.subtle"
          borderRadius="md"
          borderWidth={1}
          borderColor="red.muted"
        >
          <Text color="red.fg">{error ?? "No data available."}</Text>
        </Box>
      </Container>
    );
  }

  const maxFactionWins = stats.topFactions[0]?.wins ?? 1;
  const maxPlayerWins = stats.topPlayers[0]?.wins ?? 1;

  return (
    <Container maxW="container.xl" py={8}>
      <VStack gap={8} align="stretch">
        <HStack justify="space-between" align="baseline" wrap="wrap" gap={2}>
          <Heading as="h1" size="xl">
            Statistics
          </Heading>
          {stats.cachedAt && (
            <HStack gap={1} color="fg.subtle">
              <LuClock size={12} />
              <Text fontSize="xs">
                Updated{" "}
                {new Date(stats.cachedAt).toLocaleTimeString("en-GB", {
                  timeZone: "UTC",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}{" "}
                UTC
              </Text>
            </HStack>
          )}
        </HStack>

        {/* Overview cards */}
        <SimpleGrid columns={{ base: 2, md: 4 }} gap={4}>
          <StatCard
            label="Total Tournaments"
            value={stats.tournaments.total}
            icon={<LuTrophy />}
            colorPalette="yellow"
          />
          <StatCard
            label="Active Tournaments"
            value={stats.tournaments.active}
            icon={<LuClock />}
            colorPalette="green"
          />
          <StatCard
            label="Matches Played"
            value={stats.matches.completed}
            icon={<LuSwords />}
            colorPalette="blue"
          />
          <StatCard
            label="Completion Rate"
            value={`${stats.matches.completionRate}%`}
            icon={<LuCircleCheck />}
            colorPalette="teal"
            sub={`${stats.matches.total} total matches`}
          />
        </SimpleGrid>

        <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6}>
          {/* Top Factions */}
          <Card.Root bg={cardBg}>
            <Card.Header>
              <HStack gap={2}>
                <Box color="orange.fg">
                  <LuShield />
                </Box>
                <Heading size="md">Top Winning Factions</Heading>
              </HStack>
            </Card.Header>
            <Card.Body>
              {stats.topFactions.length === 0 ? (
                <Text color="fg.muted" fontSize="sm">
                  No faction data yet.
                </Text>
              ) : (
                <VStack gap={3} alignItems="stretch">
                  <For each={stats.topFactions}>
                    {(f, i) => (
                      <Box key={f.faction}>
                        <HStack justifyContent="space-between" mb={1}>
                          <HStack gap={2}>
                            <Text
                              fontSize="sm"
                              color="fg.muted"
                              w={5}
                              textAlign="right"
                            >
                              #{i + 1}
                            </Text>
                            <Text fontSize="sm" fontWeight="medium">
                              {f.faction}
                            </Text>
                          </HStack>
                          <Badge colorPalette="orange" variant="subtle">
                            {f.wins} {f.wins === 1 ? "win" : "wins"}
                          </Badge>
                        </HStack>
                        <Box h="6px" bg={barBg} borderRadius="full">
                          <Box
                            h="full"
                            borderRadius="full"
                            bg="orange.subtle"
                            borderWidth={1}
                            borderColor="orange.muted"
                            style={{
                              width: `${(f.wins / maxFactionWins) * 100}%`,
                            }}
                          />
                        </Box>
                      </Box>
                    )}
                  </For>
                </VStack>
              )}
            </Card.Body>
          </Card.Root>

          {/* Top Players */}
          <Card.Root bg={cardBg}>
            <Card.Header>
              <HStack gap={2}>
                <Box color="blue.fg">
                  <LuTrophy />
                </Box>
                <Heading size="md">Top Players</Heading>
              </HStack>
            </Card.Header>
            <Card.Body>
              {stats.topPlayers.length === 0 ? (
                <Text color="fg.muted" fontSize="sm">
                  No player data yet.
                </Text>
              ) : (
                <VStack gap={3} alignItems="stretch">
                  <For each={stats.topPlayers}>
                    {(p, i) => (
                      <Box key={p.name}>
                        <HStack justifyContent="space-between" mb={1}>
                          <HStack gap={2}>
                            <Text
                              fontSize="sm"
                              color={
                                i === 0
                                  ? "yellow.fg"
                                  : i === 1
                                    ? "gray.fg"
                                    : i === 2
                                      ? "orange.fg"
                                      : "fg.muted"
                              }
                              w={5}
                              textAlign="right"
                              fontWeight={i < 3 ? "bold" : "normal"}
                            >
                              #{i + 1}
                            </Text>
                            <VStack alignItems="flex-start" gap={0}>
                              <Text fontSize="sm" fontWeight="medium">
                                {p.name}
                              </Text>
                              {p.factions.filter(Boolean).length > 0 && (
                                <Text fontSize="xs" color="fg.muted">
                                  {p.factions.filter(Boolean).join(", ")}
                                </Text>
                              )}
                            </VStack>
                          </HStack>
                          <Badge colorPalette="blue" variant="subtle">
                            {p.wins} {p.wins === 1 ? "win" : "wins"}
                          </Badge>
                        </HStack>
                        <Box h="6px" bg={barBg} borderRadius="full">
                          <Box
                            h="full"
                            borderRadius="full"
                            bg="blue.subtle"
                            borderWidth={1}
                            borderColor="blue.muted"
                            style={{
                              width: `${(p.wins / maxPlayerWins) * 100}%`,
                            }}
                          />
                        </Box>
                      </Box>
                    )}
                  </For>
                </VStack>
              )}
            </Card.Body>
          </Card.Root>

          {/* Recent Tournament Winners */}
          <Card.Root bg={cardBg}>
            <Card.Header>
              <HStack gap={2}>
                <Box color="yellow.fg">
                  <LuTrophy />
                </Box>
                <Heading size="md">Recent Tournament Winners</Heading>
              </HStack>
              <Text fontSize="xs" color="fg.muted">
                Last 7 days
              </Text>
            </Card.Header>
            <Card.Body>
              {stats.recentWinners.length === 0 ? (
                <Text fontSize="sm" color="fg.muted" fontStyle="italic">
                  No tournaments completed in the last 7 days.
                </Text>
              ) : (
                <VStack gap={3} alignItems="stretch">
                  <For each={stats.recentWinners}>
                    {(w, i) => (
                      <Box key={i}>
                        {i > 0 && <Separator mb={3} />}
                        <HStack
                          justifyContent="space-between"
                          wrap="wrap"
                          gap={2}
                        >
                          <VStack align="start" gap={0}>
                            <Text
                              fontSize="sm"
                              fontWeight="semibold"
                              lineClamp={1}
                            >
                              {w.tournamentName}
                            </Text>
                            <Text fontSize="xs" color="fg.muted">
                              {w.tournamentType}
                            </Text>
                          </VStack>
                          <VStack align="end" gap={0}>
                            <HStack gap={1}>
                              <LuTrophy
                                size={12}
                                color="var(--chakra-colors-yellow-500)"
                              />
                              <Text fontSize="sm" fontWeight="bold">
                                {dn(w.winnerName)}
                              </Text>
                            </HStack>
                            {w.winnerFaction && (
                              <Badge
                                size="sm"
                                variant="subtle"
                                colorPalette="gray"
                              >
                                {w.winnerFaction}
                              </Badge>
                            )}
                          </VStack>
                        </HStack>
                      </Box>
                    )}
                  </For>
                </VStack>
              )}
            </Card.Body>
          </Card.Root>

          {/* Top Tournament Creators */}
          <Card.Root bg={cardBg}>
            <Card.Header>
              <HStack gap={2}>
                <Box color="teal.fg">
                  <LuUsers />
                </Box>
                <Heading size="md">Top Tournament Creators</Heading>
              </HStack>
            </Card.Header>
            <Card.Body>
              {stats.topCreators.length === 0 ? (
                <Text color="fg.muted" fontSize="sm">
                  No data yet.
                </Text>
              ) : (
                <VStack gap={2} alignItems="stretch">
                  <For each={stats.topCreators}>
                    {(c, i) => (
                      <HStack key={c.username} justifyContent="space-between">
                        <HStack gap={2}>
                          <Text
                            fontSize="sm"
                            color="fg.muted"
                            w={5}
                            textAlign="right"
                          >
                            #{i + 1}
                          </Text>
                          <Text fontSize="sm" fontWeight="medium">
                            {c.username}
                          </Text>
                        </HStack>
                        <HStack gap={2}>
                          <Badge colorPalette="teal" variant="subtle">
                            {c.tournamentsCreated} created
                          </Badge>
                          {c.completed > 0 && (
                            <Badge colorPalette="gray" variant="subtle">
                              {c.completed} done
                            </Badge>
                          )}
                        </HStack>
                      </HStack>
                    )}
                  </For>
                </VStack>
              )}
            </Card.Body>
          </Card.Root>
        </SimpleGrid>

        {/* Recent Completed Tournaments */}
        {stats.recentTournaments.length > 0 && (
          <Card.Root bg={cardBg}>
            <Card.Header>
              <HStack gap={2}>
                <Box color="gray.fg">
                  <LuTrophy />
                </Box>
                <Heading size="md">Recent Completed Tournaments</Heading>
              </HStack>
            </Card.Header>
            <Card.Body>
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
                <For each={stats.recentTournaments}>
                  {(t) => (
                    <Box
                      key={t._id}
                      p={3}
                      borderRadius="md"
                      borderWidth={1}
                      borderColor="border"
                    >
                      <VStack alignItems="flex-start" gap={1}>
                        <Text
                          fontWeight="semibold"
                          fontSize="sm"
                          truncate
                          maxW="full"
                        >
                          {t.name}
                        </Text>
                        <HStack gap={2}>
                          <Badge colorPalette="gray" size="sm" variant="subtle">
                            {t.tournamentType}
                          </Badge>
                          <Text fontSize="xs" color="fg.muted">
                            {t.participants.length} players
                          </Text>
                        </HStack>
                        <Text fontSize="xs" color="fg.subtle">
                          {new Date(t.createdAt).toLocaleDateString()}
                        </Text>
                      </VStack>
                    </Box>
                  )}
                </For>
              </SimpleGrid>
            </Card.Body>
          </Card.Root>
        )}
      </VStack>
    </Container>
  );
};

export default StatisticsPage;
