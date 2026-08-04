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
  chakra,
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

type Game = "wh3" | "40k";

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

interface GameStats {
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

interface Stats {
  cachedAt?: string;
  wh3: GameStats;
  "40k": GameStats;
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
  colorPalette = "crimson",
  sub,
}) => {
  const bg = "bg.panel";
  const iconBg =
    colorPalette === "ink" ? "bg.subtle" : `${colorPalette}.subtle`;
  const iconColor =
    colorPalette === "ink" ? "fg.secondary" : `${colorPalette}.fg`;
  const accent =
    colorPalette === "ink" ? "border.emphasized" : `${colorPalette}.border`;
  return (
    <Card.Root
      bg={bg}
      borderWidth={1}
      borderColor="border.subtle"
      borderTopWidth="2px"
      borderTopColor={accent}
      shadow="sm"
      transition="all 0.15s ease"
      _hover={{ borderColor: "border.emphasized", shadow: "md" }}
    >
      <Card.Body p={{ base: 3, md: 4 }}>
        <VStack alignItems="flex-start" gap={2}>
          <Box
            p={2}
            borderRadius="md"
            bg={iconBg}
            color={iconColor}
            fontSize="lg"
          >
            {icon}
          </Box>
          <VStack alignItems="flex-start" gap={0}>
            <Text fontSize="2xl" fontWeight="bold" lineHeight="1">
              {value}
            </Text>
            <Text fontSize="xs" color="fg.secondary" lineHeight="tight" mt={1}>
              {label}
            </Text>
            {sub && (
              <Text fontSize="xs" color="fg.secondary">
                {sub}
              </Text>
            )}
          </VStack>
        </VStack>
      </Card.Body>
    </Card.Root>
  );
};

const StatisticsPage: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [game, setGame] = useState<Game>("wh3");

  // Cards follow the app-wide pattern (TournamentViewPage / TournamentList):
  // bg.panel fill + a real drop shadow (shadow sm) for elevation + border.subtle
  // for a visible edge. The shadow is what makes a light card read as raised
  // above the light page — switching the fill to bg.muted (a prior attempt)
  // made the card visible but tanked text contrast (fg.muted dropped to 2.66:1,
  // failing WCAG). Elevation, not a darker fill, is the correct separator.
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
          bg="status.loss.subtle"
          borderRadius="md"
          borderWidth={1}
          borderColor="status.loss.border"
        >
          <Text color="status.loss">{error ?? "No data available."}</Text>
        </Box>
      </Container>
    );
  }

  const active = stats[game];
  const maxFactionWins = active.topFactions[0]?.wins ?? 1;
  const maxPlayerWins = active.topPlayers[0]?.wins ?? 1;

  return (
    <Container maxW="container.xl" py={8}>
      <VStack gap={8} align="stretch">
        <HStack justify="space-between" align="baseline" wrap="wrap" gap={2}>
          <Heading as="h1" size="xl">
            Statistics
          </Heading>
          {stats.cachedAt && (
            <HStack gap={1} color="fg.muted">
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

        {/* Game-system toggle (WH3 / 40K) */}
        <HStack gap={1} p={2} borderRadius="md" borderWidth={1} borderColor="border" bg="bg.subtle" w="fit-content">
          <chakra.button
            type="button"
            py={1.5}
            px={4}
            borderRadius="sm"
            borderWidth={1}
            fontSize="sm"
            fontWeight="medium"
            cursor="pointer"
            transition="all 0.15s"
            onClick={() => setGame("wh3")}
            bg={game === "wh3" ? "colorPalette.subtle" : "transparent"}
            borderColor={game === "wh3" ? "colorPalette.muted" : "border"}
            color={game === "wh3" ? "fg" : "fg.muted"}
            colorPalette="ink"
          >
            WH3
          </chakra.button>
          <chakra.button
            type="button"
            py={1.5}
            px={4}
            borderRadius="sm"
            borderWidth={1}
            fontSize="sm"
            fontWeight="medium"
            cursor="pointer"
            transition="all 0.15s"
            onClick={() => setGame("40k")}
            bg={game === "40k" ? "colorPalette.subtle" : "transparent"}
            borderColor={game === "40k" ? "colorPalette.muted" : "border"}
            color={game === "40k" ? "fg" : "fg.muted"}
            colorPalette="verdigris"
          >
            40K
          </chakra.button>
        </HStack>

        {/* Overview cards */}
        <SimpleGrid columns={{ base: 2, md: 4 }} gap={4}>
          <StatCard
            label="Total Tournaments"
            value={active.tournaments.total}
            icon={<LuTrophy />}
            colorPalette="brass"
          />
          <StatCard
            label="Active Tournaments"
            value={active.tournaments.active}
            icon={<LuClock />}
            colorPalette="verdigris"
          />
          <StatCard
            label="Matches Played"
            value={active.matches.completed}
            icon={<LuSwords />}
            colorPalette="crimson"
          />
          <StatCard
            label="Completed Tournaments"
            value={active.tournaments.completed}
            icon={<LuCircleCheck />}
            colorPalette="ink"
            sub={`of ${active.tournaments.total} total`}
          />
        </SimpleGrid>

        <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6}>
          {/* Top Factions */}
          <Card.Root
            bg={cardBg}
            borderWidth={1}
            borderColor="border.subtle"
            borderTopWidth="2px"
            borderTopColor="gold.border"
            shadow="sm"
            transition="all 0.15s ease"
            _hover={{ borderColor: "border.emphasized", shadow: "md" }}
          >
            <Card.Header>
              <HStack gap={2}>
                <Box color="gold.text">
                  <LuShield />
                </Box>
                <Heading size="md">Top Winning Factions</Heading>
              </HStack>
            </Card.Header>
            <Card.Body>
              {active.topFactions.length === 0 ? (
                <Text color="fg.secondary" fontSize="sm">
                  No faction data yet.
                </Text>
              ) : (
                <VStack gap={3} alignItems="stretch">
                  <For each={active.topFactions}>
                    {(f, i) => (
                      <Box key={f.faction}>
                        <HStack justifyContent="space-between" mb={1}>
                          <HStack gap={2}>
                            <Text
                              fontSize="sm"
                              color="fg.secondary"
                              w={5}
                              textAlign="right"
                            >
                              #{i + 1}
                            </Text>
                            <Text fontSize="sm" fontWeight="medium">
                              {f.faction}
                            </Text>
                          </HStack>
                          <Badge colorPalette="brass" variant="subtle">
                            {f.wins} {f.wins === 1 ? "win" : "wins"}
                          </Badge>
                        </HStack>
                        <Box h="6px" bg={barBg} borderRadius="full">
                          <Box
                            h="full"
                            borderRadius="full"
                            bg="gold.subtle"
                            borderWidth={1}
                            borderColor="gold.border"
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
          <Card.Root
            bg={cardBg}
            borderWidth={1}
            borderColor="border.subtle"
            borderTopWidth="2px"
            borderTopColor="gold.border"
            shadow="sm"
            transition="all 0.15s ease"
            _hover={{ borderColor: "border.emphasized", shadow: "md" }}
          >
            <Card.Header>
              <HStack gap={2}>
                <Box color="gold.text">
                  <LuTrophy />
                </Box>
                <Heading size="md">Top Players</Heading>
              </HStack>
            </Card.Header>
            <Card.Body>
              {active.topPlayers.length === 0 ? (
                <Text color="fg.secondary" fontSize="sm">
                  No player data yet.
                </Text>
              ) : (
                <VStack gap={3} alignItems="stretch">
                  <For each={active.topPlayers}>
                    {(p, i) => (
                      <Box key={p.name}>
                        <HStack justifyContent="space-between" mb={1}>
                          <HStack gap={2}>
                            <Text
                              fontSize="sm"
                              color={
                                i === 0
                                  ? "gold.text"
                                  : i === 1
                                    ? "fg.secondary"
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
                                <Text fontSize="xs" color="fg.secondary">
                                  {p.factions.filter(Boolean).join(", ")}
                                </Text>
                              )}
                            </VStack>
                          </HStack>
                          <Badge colorPalette="brass" variant="subtle">
                            {p.wins} {p.wins === 1 ? "win" : "wins"}
                          </Badge>
                        </HStack>
                        <Box h="6px" bg={barBg} borderRadius="full">
                          <Box
                            h="full"
                            borderRadius="full"
                            bg="brass.subtle"
                            borderWidth={1}
                            borderColor="brass.muted"
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
          <Card.Root
            bg={cardBg}
            borderWidth={1}
            borderColor="border.subtle"
            borderTopWidth="2px"
            borderTopColor="info.border"
            shadow="sm"
            transition="all 0.15s ease"
            _hover={{ borderColor: "border.emphasized", shadow: "md" }}
          >
            <Card.Header>
              <HStack gap={2}>
                <Box color="gold.text">
                  <LuTrophy />
                </Box>
                <Heading size="md">Recent Tournament Winners</Heading>
              </HStack>
              <Text fontSize="xs" color="fg.muted">
                Last 7 days
              </Text>
            </Card.Header>
            <Card.Body>
              {active.recentWinners.length === 0 ? (
                <Text fontSize="sm" color="fg.secondary" fontStyle="italic">
                  No tournaments completed in the last 7 days.
                </Text>
              ) : (
                <VStack gap={3} alignItems="stretch">
                  <For each={active.recentWinners}>
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
                            <Text fontSize="xs" color="fg.secondary">
                              {w.tournamentType}
                            </Text>
                          </VStack>
                          <VStack align="end" gap={0}>
                            <HStack gap={1}>
                              <LuTrophy
                                size={12}
                                color="var(--chakra-colors-gold-text)"
                              />
                              <Text
                                fontSize="sm"
                                fontWeight="bold"
                                color="gold.text"
                              >
                                {dn(w.winnerName)}
                              </Text>
                            </HStack>
                            {w.winnerFaction && (
                              <Badge
                                size="sm"
                                variant="subtle"
                                colorPalette="ink"
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
          <Card.Root
            bg={cardBg}
            borderWidth={1}
            borderColor="border.subtle"
            borderTopWidth="2px"
            borderTopColor="brass.border"
            shadow="sm"
            transition="all 0.15s ease"
            _hover={{ borderColor: "border.emphasized", shadow: "md" }}
          >
            <Card.Header>
              <HStack gap={2}>
                <Box color="gold.text">
                  <LuTrophy />
                </Box>
                <Heading size="md">Top Tournament Creators</Heading>
              </HStack>
            </Card.Header>
            <Card.Body>
              {active.topCreators.length === 0 ? (
                <Text color="fg.secondary" fontSize="sm">
                  No data yet.
                </Text>
              ) : (
                <VStack gap={2} alignItems="stretch">
                  <For each={active.topCreators}>
                    {(c, i) => (
                      <HStack key={c.username} justifyContent="space-between">
                        <HStack gap={2}>
                          <Text
                            fontSize="sm"
                            color={
                              i === 0
                                ? "gold.text"
                                : i === 1
                                  ? "fg.secondary"
                                  : "fg.muted"
                            }
                            fontWeight={i < 2 ? "bold" : "normal"}
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
                          <Badge colorPalette="brass" variant="subtle">
                            {c.tournamentsCreated} created
                          </Badge>
                          {c.completed > 0 && (
                            <Badge colorPalette="ink" variant="subtle">
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
        {active.recentTournaments.length > 0 && (
          <Card.Root
            bg={cardBg}
            borderWidth={1}
            borderColor="border.subtle"
            borderTopWidth="2px"
            borderTopColor="info.border"
            shadow="sm"
            transition="all 0.15s ease"
            _hover={{ borderColor: "border.emphasized", shadow: "md" }}
          >
            <Card.Header>
              <HStack gap={2}>
                <Box color="info.text">
                  <LuTrophy />
                </Box>
                <Heading size="md">Recent Completed Tournaments</Heading>
              </HStack>
            </Card.Header>
            <Card.Body>
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
                <For each={active.recentTournaments}>
                  {(t) => (
                    <Box
                      key={t._id}
                      p={3}
                      borderRadius="md"
                      bg="bg.subtle"
                      borderWidth={1}
                      borderColor="border.subtle"
                      borderTopColor="info.border"
                      borderTopWidth="2px"
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
                          <Badge colorPalette="ink" size="sm" variant="subtle">
                            {t.tournamentType}
                          </Badge>
                          <Text fontSize="xs" color="fg.secondary">
                            {t.participants.length} players
                          </Text>
                        </HStack>
                        <Text fontSize="xs" color="fg.secondary">
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
