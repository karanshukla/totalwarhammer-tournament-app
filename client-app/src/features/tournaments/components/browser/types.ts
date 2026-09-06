export interface BrowserParticipant {
  _id: string;
  userId?: string | null;
  name: string;
  faction: string;
}

export interface BrowserTournament {
  _id: string;
  code?: string;
  name: string;
  description: string;
  playerCount: number;
  tournamentType: string;
  bannedFactions: string[];
  enable40kFactions?: boolean;
  participants: BrowserParticipant[];
  status: "pending" | "active" | "completed";
  createdAt: string;
}
