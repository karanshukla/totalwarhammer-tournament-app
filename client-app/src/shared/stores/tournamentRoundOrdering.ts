import type { Round } from "@/features/tournaments/components/bracket/types";

/**
 * Display order for round titles, highest first. Numbered rounds ("Round 3")
 * sort by their number within the `NUMBERED_ROUND_BASE` band so "Round 12"
 * still lands below every named stage.
 */
const ROUND_SORT_WEIGHT = {
  final: 100,
  bronzeFinal: 99,
  semiFinal: 90,
  quarterFinal: 80,
  numberedRoundBase: 10,
  default: 50,
} as const;

export const getRoundSortKey = (title: string): number => {
  const lowerTitle = title.toLowerCase();
  if (
    lowerTitle.includes("final") &&
    !lowerTitle.includes("semi") &&
    !lowerTitle.includes("quarter") &&
    !lowerTitle.includes("bronze")
  )
    return ROUND_SORT_WEIGHT.final;
  if (lowerTitle.includes("bronze final") || lowerTitle.includes("3rd place"))
    return ROUND_SORT_WEIGHT.bronzeFinal;
  if (lowerTitle.includes("semi-final")) return ROUND_SORT_WEIGHT.semiFinal;
  if (lowerTitle.includes("quarter-final"))
    return ROUND_SORT_WEIGHT.quarterFinal;

  const roundMatch = lowerTitle.match(/round\s+(\d+)/);
  if (roundMatch && roundMatch[1]) {
    return ROUND_SORT_WEIGHT.numberedRoundBase + parseInt(roundMatch[1], 10);
  }

  return ROUND_SORT_WEIGHT.default;
};

export const sortRounds = (rounds: Round[]): Round[] => {
  return [...rounds].sort(
    (a, b) => getRoundSortKey(a.title) - getRoundSortKey(b.title),
  );
};

/**
 * Renumbers every match "Match N" in bracket order, skipping titles that
 * contain "final" so stages like "Final Match" keep their special title.
 * Assumes `rounds` is already sorted into the desired display order.
 */
export const renumberAllMatchTitlesGlobally = (rounds: Round[]): Round[] => {
  let matchNumber = 1;
  return rounds.map((round) => ({
    ...round,
    matches: round.matches.map((match) => {
      if (match.title.toLowerCase().includes("final")) {
        return match;
      }
      return { ...match, title: `Match ${matchNumber++}` };
    }),
  }));
};
