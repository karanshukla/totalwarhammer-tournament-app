import type { Match } from "@/shared/tournament/types";
import { DOUBLE_ELIMINATION } from "@/shared/tournament/outcome";

const lastRoundOf = (matches: Match[]) =>
  matches.length ? Math.max(...matches.map((m) => m.round)) : 0;

const allCompleted = (matches: Match[]) =>
  matches.every((m) => m.status === "completed");

/**
 * Whether every match the organiser is currently waiting on has a result.
 *
 * Double elimination runs two brackets plus a grand final in parallel, each
 * numbering its own rounds, so "the current round" is the live round of every
 * bracket at once rather than a single highest round number.
 */
export function canAdvanceRound(
  tournamentType: string,
  matches: Match[],
): boolean {
  if (!matches.length) return false;

  if (tournamentType === DOUBLE_ELIMINATION) {
    const sideAt = (side: Match["bracketSide"]) => {
      const inSide = matches.filter((m) => m.bracketSide === side);
      const round = lastRoundOf(inSide);
      return inSide.filter((m) => m.round === round);
    };
    const grandFinal = matches.filter((m) => m.bracketSide === "grand_final");
    const lastGrandFinal = grandFinal[grandFinal.length - 1];

    return (
      allCompleted(sideAt("winners")) &&
      allCompleted(sideAt("losers")) &&
      (!lastGrandFinal || lastGrandFinal.status === "completed")
    );
  }

  const lastRound = lastRoundOf(matches);
  return allCompleted(matches.filter((m) => m.round === lastRound));
}
