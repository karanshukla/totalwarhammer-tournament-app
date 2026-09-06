import React, { useEffect, useState } from "react";
import {
  Button,
  CardRoot,
  VStack,
  HStack,
  Heading,
  Text,
  Badge,
  SimpleGrid,
  Skeleton,
  Separator,
  Box,
} from "@chakra-ui/react";
import {
  LuTrophy,
  LuSwords,
  LuShield,
  LuChartBar,
  LuDownload,
} from "react-icons/lu";
import {
  fetchUserStats,
  UserStatsData,
  GameUserStats,
} from "../api/accountApi";
import GameSystemToggle from "@/shared/ui/GameSystemToggle";
import TimeRangeSelect from "@/shared/ui/TimeRangeSelect";
import { RANGE_DESCRIPTIONS, type StatsRange } from "@/shared/ui/timeRange";
import { toCsv, csvFilename, downloadCsv } from "@/shared/utils/csv";
import { toaster } from "@/shared/ui/toasterStore";

type GameSystem = "wh3" | "40k";

const EMPTY_STATS: GameUserStats = {
  tournamentsCreated: 0,
  matchesPlayed: 0,
  wins: 0,
  losses: 0,
  factions: [],
};

const UserStatsCard: React.FC = () => {
  const [stats, setStats] = useState<UserStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [game, setGame] = useState<GameSystem>("wh3");
  const [range, setRange] = useState<StatsRange>("all");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    // Without the catch a failed request left `loading` true forever, so the
    // card sat on animated skeletons with no error and no retry.
    fetchUserStats({ range, detail: "full" })
      .then((data) => !cancelled && setStats(data))
      .catch(() => !cancelled && setStats(null))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [range]);

  const activeGameStats: GameUserStats = stats?.[game] ?? EMPTY_STATS;

  const handleExportCsv = () => {
    setExporting(true);
    try {
      const rows = [
        {
          section: "summary",
          faction: "",
          tournamentsCreated: activeGameStats.tournamentsCreated,
          matchesPlayed: activeGameStats.matchesPlayed,
          wins: activeGameStats.wins,
          losses: activeGameStats.losses,
        },
        ...activeGameStats.factions.map((faction) => ({
          section: "faction",
          faction: faction.name,
          tournamentsCreated: "",
          matchesPlayed: faction.count,
          wins: faction.wins ?? "",
          losses:
            faction.wins === undefined ? "" : faction.count - faction.wins,
        })),
      ];
      downloadCsv(
        csvFilename({ surface: "account", section: "activity", game, range }),
        toCsv(rows),
      );
    } catch {
      toaster.create({
        title: "Export failed",
        description: "Could not build your activity CSV. Please try again.",
        type: "error",
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <CardRoot p={5} borderWidth="1px" borderRadius="lg" bg="bg.panel">
      <HStack justify="space-between" align="center" mb={2} wrap="wrap" gap={3}>
        <Heading size="md">Your Activity</Heading>
        <HStack gap={2} wrap="wrap">
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
            <TimeRangeSelect
              value={range}
              onChange={setRange}
              size="sm"
              disabled={loading}
            />
          </Box>
          <Button
            size="xs"
            variant="ghost"
            colorPalette="ink"
            onClick={handleExportCsv}
            loading={exporting}
            disabled={loading}
            aria-label="Export your activity as CSV"
          >
            <LuDownload />
            CSV
          </Button>
        </HStack>
      </HStack>

      <Text fontSize="xs" color="fg.muted" mb={4}>
        {RANGE_DESCRIPTIONS[range]} — tournaments created is always all-time.
      </Text>

      <SimpleGrid columns={{ base: 2, sm: 4 }} gap={4} mb={6}>
        {[
          {
            icon: LuTrophy,
            label: "Tournaments",
            value: activeGameStats.tournamentsCreated,
            bg: "gold.subtle",
            color: "gold.text",
          },
          {
            icon: LuSwords,
            label: "Matches",
            value: activeGameStats.matchesPlayed,
            bg: "info.subtle",
            color: "info.text",
          },
          {
            icon: LuChartBar,
            label: "Wins",
            value: activeGameStats.wins,
            bg: "info.subtle",
            color: "info.text",
          },
          {
            icon: LuShield,
            label: "Losses",
            value: activeGameStats.losses,
            bg: "brand.subtle",
            color: "brand.text",
          },
        ].map(({ icon: Icon, label, value, bg, color }) => (
          <Box
            key={label}
            p={3}
            borderRadius="md"
            bg="bg.subtle"
            textAlign="center"
          >
            <Box
              display="inline-flex"
              p={2}
              borderRadius="md"
              bg={bg}
              color={color}
              fontSize="lg"
              mb={2}
            >
              <Icon />
            </Box>
            <Skeleton loading={loading} borderRadius="md">
              <Text fontSize="2xl" fontWeight="bold">
                {value}
              </Text>
            </Skeleton>
            <Text fontSize="xs" color="fg.muted">
              {label}
            </Text>
          </Box>
        ))}
      </SimpleGrid>

      {(loading ||
        (activeGameStats.factions && activeGameStats.factions.length > 0)) && (
        <>
          <Separator mb={4} />
          <Heading
            size="sm"
            color="fg.muted"
            textTransform="uppercase"
            letterSpacing="wider"
            mb={3}
          >
            Factions played
          </Heading>
          <VStack align="stretch" gap={2} mb={6}>
            {loading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} h="24px" borderRadius="md" />
                ))
              : activeGameStats.factions.map((faction) => (
                  <HStack key={faction.name} justify="space-between">
                    <Text fontSize="sm">{faction.name}</Text>
                    <HStack gap={2}>
                      {faction.wins !== undefined && (
                        <Badge colorPalette="brass" variant="subtle">
                          {faction.wins} {faction.wins === 1 ? "win" : "wins"}
                        </Badge>
                      )}
                      <Badge colorPalette="ink" variant="subtle">
                        {faction.count}{" "}
                        {faction.count === 1 ? "match" : "matches"}
                      </Badge>
                    </HStack>
                  </HStack>
                ))}
          </VStack>
        </>
      )}

      {!loading &&
        activeGameStats.matchesPlayed === 0 &&
        activeGameStats.tournamentsCreated === 0 && (
          <Text fontSize="sm" color="fg.muted" textAlign="center" py={4}>
            No activity recorded yet. Join or create a tournament to get
            started.
          </Text>
        )}
    </CardRoot>
  );
};

export default UserStatsCard;
