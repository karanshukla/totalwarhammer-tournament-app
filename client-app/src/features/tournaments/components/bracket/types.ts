export interface Participant {
  id: string;
  name: string;
  faction: string;
}

export interface Match {
  id: string;
  title: string;
  roundId: string;
  bestOf: number;
  participant1Id: string | null;
  participant2Id: string | null;
  winnerId: string | null;
}

export interface Round {
  id: string;
  title: string;
  matches: Match[];
}
