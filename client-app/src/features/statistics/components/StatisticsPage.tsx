import React from "react";
import { Container, SimpleGrid, Spinner, Text, VStack } from "@chakra-ui/react";
import Callout from "@/shared/ui/Callout";
import { useStatisticsData } from "../hooks/useStatisticsData";
import StatisticsHeader from "./StatisticsHeader";
import StatisticsToolbar from "./StatisticsToolbar";
import StatisticsSummaryCards from "./StatisticsSummaryCards";
import TopFactionsSection from "./TopFactionsSection";
import TopPlayersSection from "./TopPlayersSection";
import RecentWinnersSection from "./RecentWinnersSection";
import TopCreatorsSection from "./TopCreatorsSection";
import RecentTournamentsSection from "./RecentTournamentsSection";

const StatisticsPage: React.FC = () => {
  const {
    stats,
    loading,
    error,
    game,
    setGame,
    range,
    changeRange,
    rangeLabel,
    activeGameStats,
    exportingAll,
    exportEverything,
    sectionProps,
    page,
  } = useStatisticsData();

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

  if (error || !stats || !activeGameStats) {
    return (
      <Container maxW="7xl" py={8}>
        <Callout tone="error" p={4}>
          {error ?? "No data available."}
        </Callout>
      </Container>
    );
  }

  return (
    <Container maxW="7xl" py={8}>
      <VStack gap={8} align="stretch">
        <StatisticsHeader cachedAt={stats.cachedAt} />

        <StatisticsToolbar
          game={game}
          onGameChange={setGame}
          range={range}
          onRangeChange={changeRange}
          onExportAll={exportEverything}
          exportingAll={exportingAll}
        />

        <StatisticsSummaryCards stats={activeGameStats} />

        <Callout tone="info" p={3} fontSize="xs">
          Tournament and match status counts above are always all-time — a
          status describes where something stands right now, not when it
          happened. The {rangeLabel.toLowerCase()} window applies to the
          win-based lists below.
        </Callout>

        <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6}>
          <TopFactionsSection
            factions={page("topFactions", activeGameStats.topFactions)}
            rangeLabel={rangeLabel}
            {...sectionProps("topFactions")}
          />

          <TopPlayersSection
            players={page("topPlayers", activeGameStats.topPlayers)}
            rangeLabel={rangeLabel}
            {...sectionProps("topPlayers")}
          />

          <RecentWinnersSection
            winners={page("recentWinners", activeGameStats.recentWinners)}
            rangeLabel={rangeLabel}
            {...sectionProps("recentWinners")}
          />

          <TopCreatorsSection
            creators={page("topCreators", activeGameStats.topCreators)}
            {...sectionProps("topCreators")}
          />
        </SimpleGrid>

        {activeGameStats.recentTournaments.length > 0 && (
          <RecentTournamentsSection
            tournaments={page(
              "recentTournaments",
              activeGameStats.recentTournaments,
            )}
            rangeLabel={rangeLabel}
            {...sectionProps("recentTournaments")}
          />
        )}
      </VStack>
    </Container>
  );
};

export default StatisticsPage;
