export interface PlayerSlot {
  participantId: string;
  name: string;
  faction: string;
  isBetaFaction?: boolean;
}

export interface Match {
  _id: string;
  round: number;
  matchNumber: number;
  player1: PlayerSlot;
  player2: PlayerSlot;
  winnerId: string | null;
  loserId: string | null;
  status: "pending" | "in_progress" | "completed" | "disputed";
  notes: string;
  reportedResults: {
    reportedBy: string;
    reportedByName: string;
    winnerId: string;
  }[];
  resultOverrides: {
    previousWinnerId: string | null;
    newWinnerId: string;
    overriddenBy: string;
    reason: string;
    overriddenAt: string;
  }[];
  completedAt: string | null;
  bracketSide: "winners" | "losers" | "grand_final" | null;
}

export interface Participant {
  _id: string;
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
  status: "pending" | "active" | "completed";
  createdAt: string;
  createdBy: string;
}

export const statusColorMap: Record<string, string> = {
  pending: "brass",
  active: "verdigris",
  completed: "gray",
};
