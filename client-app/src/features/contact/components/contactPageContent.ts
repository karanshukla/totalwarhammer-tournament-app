// Static copy for ContactPage. Kept separate from the layout so the page
// component itself stays focused on structure/markup.

export interface QuickStartStep {
  step: string;
  title: string;
  desc: string;
}

export const QUICK_START_STEPS: QuickStartStep[] = [
  {
    step: "1",
    title: "Create or join a tournament",
    desc: "Go to Tournaments to create one, or enter a join code on the home page.",
  },
  {
    step: "2",
    title: "Fill the roster",
    desc: "The organiser adds players (or players join with the code). Minimum 2 players required to start.",
  },
  {
    step: "3",
    title: "Start the tournament",
    desc: "Once the organiser clicks Start, matches are generated automatically based on the format.",
  },
  {
    step: "4",
    title: "Report results & advance",
    desc: "Players report who won each match. The organiser advances rounds until the tournament completes.",
  },
];

export interface TournamentFormatInfo {
  badge: string;
  badgeColorPalette: "ink" | "verdigris";
  description: string;
  bullets: string[];
}

export const TOURNAMENT_FORMATS: TournamentFormatInfo[] = [
  {
    badge: "Single Elimination",
    badgeColorPalette: "ink",
    description:
      "Lose once and you're out. Best for quick events with a definitive winner.",
    bullets: [
      "Rounds: ⌈log₂(n)⌉",
      "Non-power-of-2 player counts get byes in round 1",
      "Minimum 2 players",
    ],
  },
  {
    badge: "Double Elimination",
    badgeColorPalette: "ink",
    description:
      "Two losses to be eliminated. Winners and Losers brackets run in parallel, meeting at the Grand Final.",
    bullets: [
      "Winners bracket → Losers bracket on first loss",
      "Grand Final can reset if Losers finalist wins",
      "Minimum 4 players",
    ],
  },
  {
    badge: "Swiss System",
    badgeColorPalette: "verdigris",
    description:
      "Nobody is eliminated. Players are paired against others with the same record each round. Best overall standings wins.",
    bullets: [
      "Rounds: ⌈log₂(n)⌉ (e.g. 8 players = 3 rounds)",
      "Odd player counts get a bye each round",
      "No rematches within the same tournament",
    ],
  },
  {
    badge: "Round Robin",
    badgeColorPalette: "ink",
    description:
      "Everyone plays everyone. Most comprehensive format - the player with the best overall record wins.",
    bullets: [
      "Rounds: n−1 (even) or n (odd players)",
      "All matches are generated upfront",
      "Organiser finalises after all matches complete",
    ],
  },
];

export const ORGANISER_RESPONSIBILITIES: string[] = [
  "Start and delete tournaments",
  "Add and remove participants",
  "Record match results directly",
  "Override disputed results with a reason",
  "Advance rounds / finalise the tournament",
  "Edit participant names and factions",
];

export const PLAYER_RESPONSIBILITIES: string[] = [
  "Join tournaments via code or tournament page",
  "Report who won your match",
  "If both players report the same winner, result confirms automatically",
  "If reports conflict, match is marked Disputed for organiser resolution",
  "View standings and bracket at any time",
];

export interface ResultReportingCard {
  tone: "win" | "loss" | "neutral";
  title: string;
  description: string;
}

export const RESULT_REPORTING_CARDS: ResultReportingCard[] = [
  {
    tone: "win",
    title: "Both agree",
    description:
      "Both players report the same winner → match completes automatically.",
  },
  {
    tone: "loss",
    title: "Conflict",
    description:
      "Players report different winners → match is marked Disputed. Organiser resolves with an optional reason.",
  },
  {
    tone: "neutral",
    title: "Organiser override",
    description:
      "Organiser can override any result at any time, even completed ones, with a logged reason.",
  },
];

export const JOIN_CODE_BULLETS: string[] = [
  "Enter the code on the Home page",
  "Codes are case-insensitive",
  "Joining is only possible while the tournament is in Pending status",
];

export const GUEST_CAPABILITIES: string[] = [
  "Join tournaments via code",
  "Report match results",
  "View standings and brackets",
  "Set a display name (Guest_XXXX by default)",
];

export const REGISTERED_CAPABILITIES: string[] = [
  "Create tournaments",
  "Persistent account across sessions",
  "Appear in Statistics",
  '"Remember me" login for 30-day sessions',
];

export interface FaqEntry {
  question: string;
  answer: string;
}

export const FAQ_ENTRIES: FaqEntry[] = [
  {
    question: "Can I change a result after it's been recorded?",
    answer:
      "Yes - organisers can override any match result using the Override button on a completed match card. An optional reason can be logged for transparency.",
  },
  {
    question: "What happens if a player doesn't report their result?",
    answer:
      "The organiser can record the result directly on behalf of both players at any time. Players reporting results is optional - the organiser always has full control.",
  },
  {
    question: "Can I add more players after the tournament starts?",
    answer:
      "No - the participant roster is locked once a tournament is started. Make sure all players are added before clicking Start.",
  },
  {
    question: "What is a bye?",
    answer:
      "A bye is a free win given to a player when there's no opponent to pair them with (e.g. odd number of players in Swiss). Bye matches are automatically marked as completed.",
  },
  {
    question: "Why can't I see the Advance Round button?",
    answer:
      "The Advance Round button only appears once all matches in the current round are completed. Make sure every match has a result recorded before trying to advance.",
  },
  {
    question:
      "What does the Grand Final bracket reset mean in Double Elimination?",
    answer:
      "In Double Elimination, the Winners bracket finalist enters the Grand Final undefeated. If the Losers bracket finalist wins, both players now have one loss each - so a reset match is played to determine the true champion.",
  },
  {
    question: "Can I delete a tournament?",
    answer:
      "Only the organiser can delete a tournament, and only while it's in Pending status (not yet started). Once started, it cannot be deleted.",
  },
  {
    question: "How are Swiss pairings generated?",
    answer:
      "Round 1 is random. Subsequent rounds pair players with the same number of wins together (top-down), avoiding rematches. If a perfect pairing isn't possible, the algorithm falls back to best-available.",
  },
];
