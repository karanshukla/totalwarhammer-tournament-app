import React from "react";
import { SimpleGrid } from "@chakra-ui/react";
import {
  LuTrophy,
  LuSwords,
  LuClock,
  LuCircleCheck,
  LuHourglass,
  LuTriangleAlert,
  LuPercent,
} from "react-icons/lu";
import StatCard from "./StatCard";
import type { GameStats } from "../api/statisticsApi";

interface StatisticsSummaryCardsProps {
  stats: GameStats;
}

/** Lifetime totals, then the live pipeline snapshot of what's in flight now. */
const StatisticsSummaryCards: React.FC<StatisticsSummaryCardsProps> = ({
  stats,
}) => (
  <>
    <SimpleGrid columns={{ base: 2, md: 4 }} gap={4}>
      <StatCard
        label="Total Tournaments"
        value={stats.tournaments.total}
        icon={<LuTrophy />}
        colorPalette="brass"
      />
      <StatCard
        label="Active Tournaments"
        value={stats.tournaments.active}
        icon={<LuClock />}
        colorPalette="verdigris"
      />
      <StatCard
        label="Matches Played"
        value={stats.matches.completed}
        icon={<LuSwords />}
        colorPalette="crimson"
      />
      <StatCard
        label="Completed Tournaments"
        value={stats.tournaments.completed}
        icon={<LuCircleCheck />}
        colorPalette="ink"
        sub={`of ${stats.tournaments.total} total`}
      />
    </SimpleGrid>

    <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} gap={4}>
      <StatCard
        label="Pending Tournaments"
        value={stats.tournaments.pending}
        icon={<LuHourglass />}
        colorPalette="ink"
        sub="Not started yet"
      />
      <StatCard
        label="Matches Pending"
        value={stats.matches.pending}
        icon={<LuHourglass />}
        colorPalette="ink"
      />
      <StatCard
        label="Matches In Progress"
        value={stats.matches.in_progress}
        icon={<LuSwords />}
        colorPalette="verdigris"
      />
      <StatCard
        label="Disputed Matches"
        value={stats.matches.disputed}
        icon={<LuTriangleAlert />}
        colorPalette="crimson"
      />
      <StatCard
        label="Match Completion"
        value={`${stats.matches.completionRate}%`}
        icon={<LuPercent />}
        colorPalette="brass"
        sub={`${stats.matches.completed} of ${stats.matches.total}`}
      />
    </SimpleGrid>
  </>
);

export default StatisticsSummaryCards;
