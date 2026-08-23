import React, { useCallback, useEffect, useState } from "react";
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
  Button,
} from "@chakra-ui/react";
import {
  LuTrophy,
  LuSwords,
  LuShield,
  LuUsers,
  LuClock,
  LuCircleCheck,
  LuTriangleAlert,
  LuHourglass,
  LuPercent,
  LuDownload,
} from "react-icons/lu";
import { displayName as dn } from "@/shared/utils/displayName";
import {
  toCsv,
  toSectionedCsv,
  csvFilename,
  downloadCsv,
} from "@/shared/utils/csv";
import Callout from "@/shared/ui/Callout";
import { toaster } from "@/shared/ui/toasterStore";
import GameSystemToggle from "@/shared/ui/GameSystemToggle";
import TimeRangeSelect from "@/shared/ui/TimeRangeSelect";
import { RANGE_DESCRIPTIONS, type StatsRange } from "@/shared/ui/timeRange";
import {
  fetchStats,
  MAX_LIST_LIMIT,
  type Game,
  type GameStats,
  type Stats,
} from "../api/statisticsApi";
import StatsSection from "./StatsSection";

type ListSection =
  | "topFactions"
  | "topPlayers"
  | "recentWinners"
  | "topCreators"
  | "recentTournaments";

// Ordered so the combined export reads down the page.
const LIST_SECTIONS: ListSection[] = [
  "topFactions",
  "topPlayers",
  "recentWinners",
  "topCreators",
  "recentTournaments",
];

const SECTION_TITLES: Record<ListSection, string> = {
  topFactions: "Top Winning Factions",
  topPlayers: "Top Players",
  recentWinners: "Recent Tournament Winners",
  topCreators: "Top Tournament Creators",
  recentTournaments: "Recent Completed Tournaments",
};

const SECTION_DEFAULTS: Record<ListSection, number> = {
  topFactions: 10,
  topPlayers: 10,
  recentWinners: 10,
  topCreators: 5,
  recentTournaments: 5,
};

const PAGE_STEP = 10;

const TOTAL_KEYS: Record<ListSection, keyof GameStats> = {
  topFactions: "topFactionsTotal",
  topPlayers: "topPlayersTotal",
  recentWinners: "recentWinnersTotal",
  topCreators: "topCreatorsTotal",
  recentTournaments: "recentTournamentsTotal",
};

// Each section flattens to its own CSV shape; nested arrays are joined so the
// file stays one row per entity.
const CSV_ROWS: Record<
  ListSection,
  (stats: GameStats) => Record<string, unknown>[]
> = {
  topFactions: (s) =>
    s.topFactions.map((f, i) => ({
      rank: i + 1,
      faction: f.faction,
      wins: f.wins,
      matchesPlayed: f.matchesPlayed ?? "",
      losses: f.losses ?? "",
      winRate: f.winRate ?? "",
    })),
  topPlayers: (s) =>
    s.topPlayers.map((p, i) => ({
      rank: i + 1,
      player: p.name,
      wins: p.wins,
      matchesPlayed: p.matchesPlayed ?? "",
      losses: p.losses ?? "",
      winRate: p.winRate ?? "",
      factions: p.factions.filter(Boolean).join("; "),
    })),
  recentWinners: (s) =>
    s.recentWinners.map((w) => ({
      tournament: w.tournamentName,
      tournamentType: w.tournamentType,
      winner: w.winnerName,
      winnerFaction: w.winnerFaction,
      completedAt: w.completedAt,
    })),
  topCreators: (s) =>
    s.topCreators.map((c, i) => ({
      rank: i + 1,
      creator: c.username,
      tournamentsCreated: c.tournamentsCreated,
      completed: c.completed,
    })),
  recentTournaments: (s) =>
    s.recentTournaments.map((t) => ({
      tournament: t.name,
      tournamentType: t.tournamentType,
      players: t.participants.length,
      playerCount: t.playerCount,
      createdAt: t.createdAt,
    })),
};

// The overview and pipeline tiles, as metric/value pairs. These are the only
// numbers on the page with no list behind them, so they need their own shape
// rather than a row builder.
const SUMMARY_ROWS = (s: GameStats): Record<string, unknown>[] => [
  { metric: "Total Tournaments", value: s.tournaments.total },
  { metric: "Active Tournaments", value: s.tournaments.active },
  { metric: "Pending Tournaments", value: s.tournaments.pending },
  { metric: "Completed Tournaments", value: s.tournaments.completed },
  { metric: "Matches Played", value: s.matches.completed },
  { metric: "Matches Pending", value: s.matches.pending },
  { metric: "Matches In Progress", value: s.matches.in_progress },
  { metric: "Disputed Matches", value: s.matches.disputed },
  { metric: "Total Matches", value: s.matches.total },
  { metric: "Match Completion %", value: s.matches.completionRate },
];

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
  const iconBg =
    colorPalette === "ink" ? "bg.subtle" : `${colorPalette}.subtle`;
  const iconColor =
    colorPalette === "ink" ? "fg.secondary" : `${colorPalette}.fg`;
  const accent =
    colorPalette === "ink" ? "border.emphasized" : `${colorPalette}.border`;
  return (
    <Card.Root
      bg="bg.panel"
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
  const [range, setRange] = useState<StatsRange>("all");
  const [shown, setShown] = useState(SECTION_DEFAULTS);
  const [pageLimit, setPageLimit] = useState<number | undefined>(undefined);
  const [pendingSection, setPendingSection] = useState<ListSection | null>(
    null,
  );
  const [exportingSection, setExportingSection] = useState<ListSection | null>(
    null,
  );
  const [exportingAll, setExportingAll] = useState(false);

  // Cards follow the app-wide pattern (TournamentViewPage / TournamentList):
  // bg.panel fill + a real drop shadow (shadow sm) for elevation + border.subtle
  // for a visible edge. The shadow is what makes a light card read as raised
  // above the light page — switching the fill to bg.muted (a prior attempt)
  // made the card visible but tanked text contrast (fg.muted dropped to 2.66:1,
  // failing WCAG). Elevation, not a darker fill, is the correct separator.

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await fetchStats({ range, limit: pageLimit });
        if (cancelled) return;
        setStats(data);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Failed to load statistics",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
          setPendingSection(null);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [range, pageLimit]);

  const active = stats?.[game];

  const showMore = useCallback(
    (section: ListSection) => {
      const next = Math.min(shown[section] + PAGE_STEP, MAX_LIST_LIMIT);
      setShown((current) => ({ ...current, [section]: next }));
      if (active && next > active[section].length) {
        setPendingSection(section);
        setPageLimit(next);
      }
    },
    [active, shown],
  );

  const changeRange = useCallback((next: StatsRange) => {
    setRange(next);
    setShown(SECTION_DEFAULTS);
    setPageLimit(undefined);
  }, []);

  // Export always reflects the full list for the current game and range, not
  // the page on screen, so it needs its own unpaginated fetch.
  const exportSection = useCallback(
    async (section: ListSection, title: string) => {
      setExportingSection(section);
      try {
        const full = await fetchStats({ range, limit: MAX_LIST_LIMIT });
        downloadCsv(
          csvFilename({ surface: "stats", section, game, range }),
          toCsv(CSV_ROWS[section](full[game])),
        );
      } catch {
        toaster.create({
          title: "Export failed",
          description: `Could not build the ${title} CSV. Please try again.`,
          type: "error",
        });
      } finally {
        setExportingSection(null);
      }
    },
    [game, range],
  );

  // One fetch feeds every block, so exporting the whole page costs the same
  // request as exporting a single section.
  const exportEverything = useCallback(async () => {
    setExportingAll(true);
    try {
      const full = await fetchStats({ range, limit: MAX_LIST_LIMIT });
      const gameStats = full[game];
      downloadCsv(
        csvFilename({ surface: "stats", section: "all", game, range }),
        toSectionedCsv([
          { title: "Summary", rows: SUMMARY_ROWS(gameStats) },
          ...LIST_SECTIONS.map((section) => ({
            title: SECTION_TITLES[section],
            rows: CSV_ROWS[section](gameStats),
          })),
        ]),
      );
    } catch {
      toaster.create({
        title: "Export failed",
        description: "Could not build the statistics CSV. Please try again.",
        type: "error",
      });
    } finally {
      setExportingAll(false);
    }
  }, [game, range]);

  if (loading) {
    return (
      <Container maxW="7xl" py={16}>
        <VStack gap={4}>
          <Spinner size="xl" role="status" aria-label="Loading statistics" />
          <Text color="fg.muted">Loading statistics…</Text>
        </VStack>
      </Container>
    );
  }

  if (error || !stats || !active) {
    return (
      <Container maxW="7xl" py={8}>
        <Callout tone="error" p={4}>
          {error ?? "No data available."}
        </Callout>
      </Container>
    );
  }

  const rangeLabel = RANGE_DESCRIPTIONS[range];
  const maxFactionWins = active.topFactions[0]?.wins ?? 1;
  const maxPlayerWins = active.topPlayers[0]?.wins ?? 1;

  const sectionProps = (section: ListSection) => ({
    title: SECTION_TITLES[section],
    shown: shown[section],
    available: (active[section] as unknown[]).length,
    total: active[TOTAL_KEYS[section]] as number | undefined,
    loadingMore: pendingSection === section,
    onShowMore: () => showMore(section),
    onExport: () => exportSection(section, SECTION_TITLES[section]),
    exporting: exportingSection === section,
  });

  const page = <T,>(section: ListSection, rows: T[]): T[] =>
    rows.slice(0, shown[section]);

  return (
    <Container maxW="7xl" py={8}>
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

        <HStack gap={3} wrap="wrap">
          <Box
            p={1}
            borderRadius="md"
            borderWidth={1}
            borderColor="border"
            bg="bg.subtle"
          >
            <GameSystemToggle value={game} onChange={setGame} size="sm" />
          </Box>
          <Box
            p={1}
            borderRadius="md"
            borderWidth={1}
            borderColor="border"
            bg="bg.subtle"
          >
            <TimeRangeSelect value={range} onChange={changeRange} size="sm" />
          </Box>
          <Button
            size="sm"
            variant="outline"
            colorPalette="ink"
            onClick={exportEverything}
            loading={exportingAll}
            ml={{ base: 0, md: "auto" }}
            aria-label="Export all statistics as CSV"
          >
            <LuDownload />
            Export all
          </Button>
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

        {/* Live pipeline: the counts a status can be in right now */}
        <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} gap={4}>
          <StatCard
            label="Pending Tournaments"
            value={active.tournaments.pending}
            icon={<LuHourglass />}
            colorPalette="ink"
            sub="Not started yet"
          />
          <StatCard
            label="Matches Pending"
            value={active.matches.pending}
            icon={<LuHourglass />}
            colorPalette="ink"
          />
          <StatCard
            label="Matches In Progress"
            value={active.matches.in_progress}
            icon={<LuSwords />}
            colorPalette="verdigris"
          />
          <StatCard
            label="Disputed Matches"
            value={active.matches.disputed}
            icon={<LuTriangleAlert />}
            colorPalette="crimson"
          />
          <StatCard
            label="Match Completion"
            value={`${active.matches.completionRate}%`}
            icon={<LuPercent />}
            colorPalette="brass"
            sub={`${active.matches.completed} of ${active.matches.total}`}
          />
        </SimpleGrid>

        <Callout tone="info" p={3} fontSize="xs">
          Tournament and match status counts above are always all-time — a
          status describes where something stands right now, not when it
          happened. The {rangeLabel.toLowerCase()} window applies to the
          win-based lists below.
        </Callout>

        <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6}>
          {/* Top Factions */}
          <StatsSection
            icon={<LuShield />}
            accent="gold.border"
            subtitle={rangeLabel}
            {...sectionProps("topFactions")}
          >
            {active.topFactions.length === 0 ? (
              <Text color="fg.secondary" fontSize="sm">
                No faction data yet.
              </Text>
            ) : (
              <VStack gap={3} alignItems="stretch">
                <For each={page("topFactions", active.topFactions)}>
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
                          <VStack alignItems="flex-start" gap={0}>
                            <Text fontSize="sm" fontWeight="medium">
                              {f.faction}
                            </Text>
                            {f.matchesPlayed !== undefined && (
                              <Text fontSize="xs" color="fg.secondary">
                                {f.matchesPlayed} played · {f.winRate}% win rate
                              </Text>
                            )}
                          </VStack>
                        </HStack>
                        <Badge colorPalette="brass" variant="subtle">
                          {f.wins} {f.wins === 1 ? "win" : "wins"}
                        </Badge>
                      </HStack>
                      <Box h="6px" bg="bg.muted" borderRadius="full">
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
          </StatsSection>

          {/* Top Players */}
          <StatsSection
            icon={<LuTrophy />}
            accent="gold.border"
            subtitle={rangeLabel}
            {...sectionProps("topPlayers")}
          >
            {active.topPlayers.length === 0 ? (
              <Text color="fg.secondary" fontSize="sm">
                No player data yet.
              </Text>
            ) : (
              <VStack gap={3} alignItems="stretch">
                <For each={page("topPlayers", active.topPlayers)}>
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
                            {p.matchesPlayed !== undefined && (
                              <Text fontSize="xs" color="fg.secondary">
                                {p.matchesPlayed} played · {p.losses} lost ·{" "}
                                {p.winRate}% win rate
                              </Text>
                            )}
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
                      <Box h="6px" bg="bg.muted" borderRadius="full">
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
          </StatsSection>

          {/* Recent Tournament Winners */}
          <StatsSection
            icon={<LuTrophy />}
            accent="info.border"
            subtitle={rangeLabel}
            {...sectionProps("recentWinners")}
          >
            {active.recentWinners.length === 0 ? (
              <Text fontSize="sm" color="fg.secondary" fontStyle="italic">
                No tournaments completed in this window.
              </Text>
            ) : (
              <VStack gap={3} alignItems="stretch">
                <For each={page("recentWinners", active.recentWinners)}>
                  {(w, i) => (
                    <Box key={`${w.tournamentName}-${w.completedAt}`}>
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
          </StatsSection>

          {/* Top Tournament Creators */}
          <StatsSection
            icon={<LuUsers />}
            accent="brass.border"
            subtitle="All time — creating a tournament isn't a dated event"
            {...sectionProps("topCreators")}
          >
            {active.topCreators.length === 0 ? (
              <Text color="fg.secondary" fontSize="sm">
                No data yet.
              </Text>
            ) : (
              <VStack gap={2} alignItems="stretch">
                <For each={page("topCreators", active.topCreators)}>
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
          </StatsSection>
        </SimpleGrid>

        {/* Recent Completed Tournaments */}
        {active.recentTournaments.length > 0 && (
          <StatsSection
            icon={<LuTrophy />}
            accent="info.border"
            iconColor="info.text"
            subtitle={rangeLabel}
            {...sectionProps("recentTournaments")}
          >
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
              <For each={page("recentTournaments", active.recentTournaments)}>
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
          </StatsSection>
        )}
      </VStack>
    </Container>
  );
};

export default StatisticsPage;
