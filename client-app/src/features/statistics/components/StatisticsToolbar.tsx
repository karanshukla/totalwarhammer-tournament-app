import React from "react";
import { Box, Button, HStack } from "@chakra-ui/react";
import { LuDownload } from "react-icons/lu";
import GameSystemToggle from "@/shared/ui/GameSystemToggle";
import TimeRangeSelect from "@/shared/ui/TimeRangeSelect";
import type { StatsRange } from "@/shared/ui/timeRange";
import type { Game } from "../api/statisticsApi";

interface StatisticsToolbarProps {
  game: Game;
  onGameChange: (game: Game) => void;
  range: StatsRange;
  onRangeChange: (range: StatsRange) => void;
  onExportAll: () => void;
  exportingAll: boolean;
}

const StatisticsToolbar: React.FC<StatisticsToolbarProps> = ({
  game,
  onGameChange,
  range,
  onRangeChange,
  onExportAll,
  exportingAll,
}) => (
  <HStack gap={3} wrap="wrap">
    <Box
      p={1}
      borderRadius="md"
      borderWidth={1}
      borderColor="border"
      bg="bg.subtle"
    >
      <GameSystemToggle value={game} onChange={onGameChange} size="sm" />
    </Box>
    <Box
      p={1}
      borderRadius="md"
      borderWidth={1}
      borderColor="border"
      bg="bg.subtle"
    >
      <TimeRangeSelect value={range} onChange={onRangeChange} size="sm" />
    </Box>
    <Button
      size="sm"
      variant="outline"
      colorPalette="ink"
      onClick={onExportAll}
      loading={exportingAll}
      ml={{ base: 0, md: "auto" }}
      aria-label="Export all statistics as CSV"
    >
      <LuDownload />
      Export all
    </Button>
  </HStack>
);

export default StatisticsToolbar;
