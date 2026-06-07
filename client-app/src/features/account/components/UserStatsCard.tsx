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
import { fetchUserStats, UserStatsData } from "../api/accountApi";

const UserStatsCard: React.FC = () => {
  const [stats, setStats] = useState<UserStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserStats().then((data) => {
      setStats(data);
      setLoading(false);
    });
  }, []);

  return (
    <CardRoot p={5} borderWidth="1px" borderRadius="lg" bg="bg.panel">
      <Heading size="md" mb={4}>
        Your Activity
      </Heading>

      {/* Summary stats */}
      <SimpleGrid columns={{ base: 2, sm: 4 }} gap={4} mb={6}>
        {[
          {
            icon: LuTrophy,
            label: "Tournaments",
            value: stats?.tournamentsCreated ?? 0,
            bg: "gold.subtle",
            color: "gold.text",
          },
          {
            icon: LuSwords,
            label: "Matches",
            value: stats?.matchesPlayed ?? 0,
            bg: "info.subtle",
            color: "info.text",
          },
          {
            icon: LuChartBar,
            label: "Wins",
            value: stats?.wins ?? 0,
            bg: "info.subtle",
            color: "info.text",
          },
          {
            icon: LuShield,
            label: "Losses",
            value: stats?.losses ?? 0,
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
      {(loading || (stats?.factions && stats.factions.length > 0)) && (
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
              : stats!.factions.map((f) => (
                  <HStack key={f.name} justify="space-between">
                    <Text fontSize="sm">{f.name}</Text>
                    <Badge colorPalette="brass" variant="subtle">
                      {f.count} {f.count === 1 ? "match" : "matches"}
                    </Badge>
                  </HStack>
                ))}
          </VStack>
        </>
      )}

      {!loading &&
        stats?.matchesPlayed === 0 &&
        stats?.tournamentsCreated === 0 && (
          <Text fontSize="sm" color="fg.muted" textAlign="center" py={4}>
            No activity recorded yet. Join or create a tournament to get
            started.
          </Text>
        )}
    </CardRoot>
  );
};

export default UserStatsCard;
