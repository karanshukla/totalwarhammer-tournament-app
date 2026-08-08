import type { Match, Participant, PlayerSlot } from "./types";

export const ROUND_ROBIN = "Round Robin";
export const SWISS_SYSTEM = "Swiss System";
export const DOUBLE_ELIMINATION = "Double Elimination";

/** Formats where every player plays on and the table decides the winner. */
export const isLeagueFormat = (tournamentType: string) =>
  tournamentType === ROUND_ROBIN || tournamentType === SWISS_SYSTEM;

export interface Standing {
  participantId: string;
  name: string;
  faction: string;
  wins: number;
  losses: number;
  played: number;
}

const isBye = (slot: Pick<PlayerSlot, "name">) => slot.name === "BYE";

const decided = (m: Match) => m.status === "completed" && !!m.winnerId;

export function computeStandings(
  participants: Participant[],
  matches: Match[],
): Standing[] {
  const table = new Map<string, Standing>(
    participants.map((p) => [
      p._id,
      {
        participantId: p._id,
        name: p.name,
        faction: p.faction,
        wins: 0,
        losses: 0,
        played: 0,
      },
    ]),
  );

  for (const m of matches) {
    if (!decided(m) || isBye(m.player2)) continue;
    const winnerId = m.winnerId!;
    const loserId =
      winnerId === m.player1.participantId
        ? m.player2.participantId
        : m.player1.participantId;

    const winner = table.get(winnerId);
    if (winner) {
      winner.wins++;
      winner.played++;
    }
    const loser = loserId ? table.get(loserId) : undefined;
    if (loser) {
      loser.losses++;
      loser.played++;
    }
  }

  return [...table.values()].sort(
    (a, b) => b.wins - a.wins || a.losses - b.losses,
  );
}

/**
 * The match whose winner takes the tournament.
 *
 * Double elimination stores the grand final as its own bracket side numbered
 * from round 1, so it sorts *below* the winners-bracket rounds — picking the
 * highest round number would crown the winners-bracket finalist and miss a
 * bracket reset entirely. Losers-bracket matches never decide the tournament.
 */
export function decidingMatch(matches: Match[]): Match | null {
  const finals = matches.filter(
    (m) => m.bracketSide === "grand_final" && decided(m),
  );
  const contenders = finals.length
    ? finals
    : matches.filter((m) => m.bracketSide !== "losers" && decided(m));
  if (!contenders.length) return null;

  const lastRound = Math.max(...contenders.map((m) => m.round));
  const inLastRound = contenders.filter((m) => m.round === lastRound);
  return inLastRound[inLastRound.length - 1];
}

/**
 * The slot that won, or null. A winnerId that matches neither slot means the
 * match references a participant that no longer exists — there is no winner to
 * report rather than a coin flip between the two players.
 */
export function winnerSlotOf(match: Match): PlayerSlot | null {
  if (!match.winnerId) return null;
  if (match.winnerId === match.player1.participantId) return match.player1;
  if (match.winnerId === match.player2.participantId) return match.player2;
  return null;
}

export interface Champion {
  name: string;
  faction: string;
}

/**
 * Who won the tournament, or null while it is still undecided.
 * League formats are topped by the standings table; knockout formats by the
 * winner of the deciding match.
 */
export function championOf(
  tournamentType: string,
  participants: Participant[],
  matches: Match[],
): Champion | null {
  if (!matches.length) return null;

  if (isLeagueFormat(tournamentType)) {
    const [leader] = computeStandings(participants, matches);
    return leader && leader.played > 0
      ? { name: leader.name, faction: leader.faction }
      : null;
  }

  const final = decidingMatch(matches);
  if (!final) return null;
  const winner = winnerSlotOf(final);
  return winner ? { name: winner.name, faction: winner.faction } : null;
}
