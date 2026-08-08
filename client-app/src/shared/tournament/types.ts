export type MatchStatus = "pending" | "in_progress" | "completed" | "disputed";

export type BracketSide = "winners" | "losers" | "grand_final" | null;

export type TournamentStatus = "pending" | "active" | "completed";

export interface PlayerSlot {
  participantId: string;
  name: string;
  faction: string;
  isBetaFaction?: boolean;
}

export interface ReportedResult {
  reportedBy: string;
  reportedByName: string;
  winnerId: string;
}

export interface ResultOverride {
  previousWinnerId: string | null;
  newWinnerId: string;
  overriddenBy: string;
  reason: string;
  overriddenAt: string;
}

export interface Match {
  _id: string;
  round: number;
  matchNumber: number;
  player1: PlayerSlot;
  player2: PlayerSlot;
  winnerId: string | null;
  loserId: string | null;
  status: MatchStatus;
  notes: string;
  reportedResults: ReportedResult[];
  resultOverrides: ResultOverride[];
  completedAt: string | null;
  bracketSide: BracketSide;
}

export interface Participant {
  _id: string;
  userId?: string | null;
  name: string;
  faction: string;
}

export interface Tournament {
  _id: string;
  name: string;
  code: string;
  description: string;
  playerCount: number;
  tournamentType: string;
  bannedFactions: string[];
  enable40kFactions: boolean;
  participants: Participant[];
  status: TournamentStatus;
  createdAt: string;
  createdBy: string;
}

export const statusColorMap: Record<string, string> = {
  pending: "ink",
  active: "verdigris",
  completed: "ink",
};
