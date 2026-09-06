import { shuffle, slot, byeMatch } from "./bracket-slots.js";

// ─── Single Elimination ───────────────────────────────────────────────────────

export function singleElimStart(
  tournamentId,
  participants,
  enable40kFactions = false,
) {
  const seeded = shuffle([...participants]);
  const docs = [];
  let matchNumber = 1;
  for (let i = 0; i < seeded.length; i += 2) {
    if (i + 1 < seeded.length) {
      docs.push({
        tournament: tournamentId,
        round: 1,
        matchNumber: matchNumber++,
        player1: slot(seeded[i], enable40kFactions),
        player2: slot(seeded[i + 1], enable40kFactions),
        bracketSide: "winners",
      });
    } else {
      docs.push(
        byeMatch(
          tournamentId,
          1,
          matchNumber++,
          slot(seeded[i], enable40kFactions),
          "winners",
        ),
      );
    }
  }
  return docs;
}

export function singleElimAdvance(
  tournamentId,
  currentRoundMatches,
  nextRound,
) {
  const winners = currentRoundMatches.map((m) => {
    const winnerId = m.winnerId?.toString();
    return winnerId === m.player1.participantId?.toString()
      ? m.player1
      : m.player2;
  });

  if (winners.length === 1) return { completed: true, docs: [] };

  const docs = [];
  let matchNumber = 1;
  for (let i = 0; i < winners.length; i += 2) {
    if (i + 1 < winners.length) {
      docs.push({
        tournament: tournamentId,
        round: nextRound,
        matchNumber: matchNumber++,
        player1: winners[i],
        player2: winners[i + 1],
        bracketSide: "winners",
      });
    } else {
      docs.push(
        byeMatch(tournamentId, nextRound, matchNumber++, winners[i], "winners"),
      );
    }
  }
  return { completed: false, docs };
}
