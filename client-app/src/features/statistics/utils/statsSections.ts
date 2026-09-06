import type { GameStats } from "../api/statisticsApi";

export type ListSection =
  | "topFactions"
  | "topPlayers"
  | "recentWinners"
  | "topCreators"
  | "recentTournaments";

// Ordered so the combined "Export all" CSV reads down the page in the same
// order the sections appear in.
export const LIST_SECTIONS: ListSection[] = [
  "topFactions",
  "topPlayers",
  "recentWinners",
  "topCreators",
  "recentTournaments",
];

export const SECTION_TITLES: Record<ListSection, string> = {
  topFactions: "Top Winning Factions",
  topPlayers: "Top Players",
  recentWinners: "Recent Tournament Winners",
  topCreators: "Top Tournament Creators",
  recentTournaments: "Recent Completed Tournaments",
};

export const SECTION_DEFAULTS: Record<ListSection, number> = {
  topFactions: 10,
  topPlayers: 10,
  recentWinners: 10,
  topCreators: 5,
  recentTournaments: 5,
};

export const PAGE_STEP = 10;

export const TOTAL_KEYS: Record<ListSection, keyof GameStats> = {
  topFactions: "topFactionsTotal",
  topPlayers: "topPlayersTotal",
  recentWinners: "recentWinnersTotal",
  topCreators: "topCreatorsTotal",
  recentTournaments: "recentTournamentsTotal",
};

// Each section flattens to its own CSV shape; nested arrays are joined so the
// file stays one row per entity.
export const CSV_ROWS: Record<
  ListSection,
  (gameStats: GameStats) => Record<string, unknown>[]
> = {
  topFactions: (gameStats) =>
    gameStats.topFactions.map((f, i) => ({
      rank: i + 1,
      faction: f.faction,
      wins: f.wins,
      matchesPlayed: f.matchesPlayed ?? "",
      losses: f.losses ?? "",
      winRate: f.winRate ?? "",
    })),
  topPlayers: (gameStats) =>
    gameStats.topPlayers.map((p, i) => ({
      rank: i + 1,
      player: p.name,
      wins: p.wins,
      matchesPlayed: p.matchesPlayed ?? "",
      losses: p.losses ?? "",
      winRate: p.winRate ?? "",
      factions: p.factions.filter(Boolean).join("; "),
    })),
  recentWinners: (gameStats) =>
    gameStats.recentWinners.map((w) => ({
      tournament: w.tournamentName,
      tournamentType: w.tournamentType,
      winner: w.winnerName,
      winnerFaction: w.winnerFaction,
      completedAt: w.completedAt,
    })),
  topCreators: (gameStats) =>
    gameStats.topCreators.map((c, i) => ({
      rank: i + 1,
      creator: c.username,
      tournamentsCreated: c.tournamentsCreated,
      completed: c.completed,
    })),
  recentTournaments: (gameStats) =>
    gameStats.recentTournaments.map((t) => ({
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
export const SUMMARY_ROWS = (
  gameStats: GameStats,
): Record<string, unknown>[] => [
  { metric: "Total Tournaments", value: gameStats.tournaments.total },
  { metric: "Active Tournaments", value: gameStats.tournaments.active },
  { metric: "Pending Tournaments", value: gameStats.tournaments.pending },
  { metric: "Completed Tournaments", value: gameStats.tournaments.completed },
  { metric: "Matches Played", value: gameStats.matches.completed },
  { metric: "Matches Pending", value: gameStats.matches.pending },
  { metric: "Matches In Progress", value: gameStats.matches.in_progress },
  { metric: "Disputed Matches", value: gameStats.matches.disputed },
  { metric: "Total Matches", value: gameStats.matches.total },
  { metric: "Match Completion %", value: gameStats.matches.completionRate },
];
