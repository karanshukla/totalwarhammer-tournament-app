import { apiConfig } from "@/core/config/apiConfig";
import { httpClient } from "@/core/api/httpClient";
import type { StatsRange } from "@/shared/ui/timeRange";

export type Game = "wh3" | "40k";

export interface TopPlayer {
  name: string;
  wins: number;
  factions: string[];
  matchesPlayed?: number;
  losses?: number;
  winRate?: number;
}

export interface TopFaction {
  faction: string;
  wins: number;
  matchesPlayed?: number;
  losses?: number;
  winRate?: number;
}

export interface TopCreator {
  username: string;
  tournamentsCreated: number;
  completed: number;
}

export interface RecentWinner {
  tournamentName: string;
  tournamentType: string;
  winnerName: string;
  winnerFaction: string;
  completedAt: string;
}

export interface RecentTournament {
  _id: string;
  name: string;
  tournamentType: string;
  participants: { name: string; faction: string }[];
  playerCount: number;
  createdAt: string;
}

export interface GameStats {
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
  topPlayersTotal?: number;
  topFactions: TopFaction[];
  topFactionsTotal?: number;
  topCreators: TopCreator[];
  topCreatorsTotal?: number;
  recentTournaments: RecentTournament[];
  recentTournamentsTotal?: number;
  recentWinners: RecentWinner[];
  recentWinnersTotal?: number;
}

export interface Stats {
  cachedAt?: string;
  range?: StatsRange;
  wh3: GameStats;
  "40k": GameStats;
}

export interface StatsQuery {
  range?: StatsRange;
  limit?: number;
  offset?: number;
}

/** Server-side cap on rows per list section; an export asks for exactly this. */
export const MAX_LIST_LIMIT = 200;

export const statsUrl = ({ range, limit, offset }: StatsQuery = {}): string => {
  const params = new URLSearchParams();
  if (range) params.set("range", range);
  if (limit !== undefined) params.set("limit", String(limit));
  if (offset !== undefined) params.set("offset", String(offset));
  const query = params.toString();
  return query
    ? `${apiConfig.endpoints.stats}?${query}`
    : apiConfig.endpoints.stats;
};

export const fetchStats = async (query: StatsQuery = {}): Promise<Stats> => {
  const res = await httpClient.get<{ success: boolean; data: Stats }>(
    statsUrl(query),
  );
  return res.data;
};
