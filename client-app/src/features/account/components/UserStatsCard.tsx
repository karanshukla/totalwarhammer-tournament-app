import React, { useEffect, useState } from "react";
import {
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
import { LuTrophy, LuSwords, LuShield, LuChartBar } from "react-icons/lu";
import {
  fetchUserStats,
  UserStatsData,
  GameUserStats,
} from "../api/accountApi";
import GameSystemToggle from "@/shared/ui/GameSystemToggle";

type Game = "wh3" | "40k";

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
  const [game, setGame] = useState<Game>("wh3");

  useEffect(() => {
    // Without the catch a failed request left `loading` true forever, so the
    // card sat on animated skeletons with no error and no retry.
    fetchUserStats()
      .then((data) => setStats(data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  const active: GameUserStats = stats?.[game] ?? EMPTY_STATS;

  return (
    <CardRoot p={5} borderWidth="1px" borderRadius="lg" bg="bg.panel">
      <HStack justify="space-between" align="center" mb={4} wrap="wrap" gap={3}>
        <Heading size="md">Your Activity</Heading>
        <Box
          p={1}
          borderRadius="md"
          borderWidth={1}
          borderColor="border"
          bg="bg.subtle"
        >
          <GameSystemToggle value={game} onChange={setGame} size="sm" />
        </Box>
      </HStack>

      {/* Summary stats */}
      <SimpleGrid columns={{ base: 2, sm: 4 }} gap={4} mb={6}>
        {[
          {
            icon: LuTrophy,
            label: "Tournaments",
            value: active.tournamentsCreated,
            bg: "gold.subtle",
            color: "gold.text",
          },
          {
            icon: LuSwords,
            label: "Matches",
            value: active.matchesPlayed,
            bg: "info.subtle",
            color: "info.text",
          },
          {
            icon: LuChartBar,
            label: "Wins",
            value: active.wins,
            bg: "info.subtle",
            color: "info.text",
          },
          {
            icon: LuShield,
            label: "Losses",
            value: active.losses,
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

      {/* Faction breakdown */}
      {(loading || (active.factions && active.factions.length > 0)) && (
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
              : active.factions.map((f) => (
                  <HStack key={f.name} justify="space-between">
                    <Text fontSize="sm">{f.name}</Text>
                    <Badge colorPalette="ink" variant="subtle">
                      {f.count} {f.count === 1 ? "match" : "matches"}
                    </Badge>
                  </HStack>
                ))}
          </VStack>
        </>
      )}

      {!loading &&
        active.matchesPlayed === 0 &&
        active.tournamentsCreated === 0 && (
          <Text fontSize="sm" color="fg.muted" textAlign="center" py={4}>
            No activity recorded yet. Join or create a tournament to get
            started.
          </Text>
        )}
    </CardRoot>
  );
};

export default UserStatsCard;
