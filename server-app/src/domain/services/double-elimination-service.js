import { shuffle, slot, byeMatch } from "./bracket-slots.js";

// ─── Double Elimination ───────────────────────────────────────────────────────
//
// Structure:
//   Winners bracket: standard SE bracket, losers go to losers bracket.
//   Losers bracket:  played in parallel rounds (WB round N losers enter LB).
//   Grand Final:     WB winner vs LB winner. Optional bracket reset if LB wins.
//
// Round numbering:
//   Winners bracket rounds are stored as round 1, 2, 3 … with bracketSide="winners"
//   Losers bracket rounds are stored as round 1, 2, 3 … with bracketSide="losers"
//   Grand final is stored as round 1 with bracketSide="grand_final"

export function doubleElimStart(
  tournamentId,
  participants,
  enable40kFactions = false,
) {
  // Same as SE round 1, but label bracketSide="winners"
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

/**
 * Advance double elimination.
 * allMatches = all matches for this tournament (all rounds, both brackets).
 * Returns { completed, docs } — docs are the new match documents to insert.
 */
export function doubleElimAdvance(tournamentId, allMatches) {
  const winnersBracket = allMatches.filter((m) => m.bracketSide === "winners");
  const losersBracket = allMatches.filter((m) => m.bracketSide === "losers");
  const grandFinal = allMatches.filter((m) => m.bracketSide === "grand_final");

  const wbMaxRound = winnersBracket.length
    ? Math.max(...winnersBracket.map((m) => m.round))
    : 0;
  const lbMaxRound = losersBracket.length
    ? Math.max(...losersBracket.map((m) => m.round))
    : 0;

  const wbCurrent = winnersBracket.filter((m) => m.round === wbMaxRound);
  const lbCurrent = losersBracket.filter((m) => m.round === lbMaxRound);

  const wbDone = wbCurrent.every((m) => m.status === "completed");
  const lbDone =
    lbCurrent.every((m) => m.status === "completed") || lbCurrent.length === 0;

  // ── Grand final already exists ────────────────────────────────────────────
  if (grandFinal.length > 0) {
    const lastGrandFinal = grandFinal[grandFinal.length - 1];
    if (lastGrandFinal.status !== "completed") {
      return {
        completed: false,
        docs: [],
        message: "Grand final not yet completed",
      };
    }
    const grandFinalWinnerId = lastGrandFinal.winnerId?.toString();
    const grandFinalP1Id = lastGrandFinal.player1.participantId?.toString();
    // If LB player (player2 in GF) wins, there's a bracket reset
    const lbPlayerWon = grandFinalWinnerId !== grandFinalP1Id;
    const resetCount = grandFinal.filter(
      (m) => m.bracketSide === "grand_final",
    ).length;
    if (lbPlayerWon && resetCount === 1) {
      // Bracket reset — play one more grand final, same matchup, both start fresh
      const nextGrandFinalRound = grandFinal.length + 1;
      const docs = [
        {
          tournament: tournamentId,
          round: nextGrandFinalRound,
          matchNumber: 1,
          player1: lastGrandFinal.player1, // WB finalist
          player2: lastGrandFinal.player2, // LB finalist (won the first GF)
          bracketSide: "grand_final",
        },
      ];
      return { completed: false, docs };
    }
    return { completed: true, docs: [] };
  }

  // ── Determine if we can create GF ────────────────────────────────────────
  // WB is done when only 1 WB winner remains and the LB is also down to 1 winner
  const wbWinners = wbCurrent
    .filter((m) => m.status === "completed")
    .map((m) =>
      m.winnerId?.toString() === m.player1.participantId?.toString()
        ? m.player1
        : m.player2,
    )
    .filter((p) => p.name !== "BYE");
  const wbLosers = wbCurrent
    .filter((m) => m.status === "completed")
    .map((m) =>
      m.winnerId?.toString() === m.player1.participantId?.toString()
        ? m.player2
        : m.player1,
    )
    .filter((p) => p.name !== "BYE");

  if (wbDone && lbDone) {
    // Check if we have exactly 1 WB survivor and 1 LB survivor → grand final
    const lbWinners = lbCurrent.length
      ? lbCurrent
          .filter((m) => m.status === "completed")
          .map((m) =>
            m.winnerId?.toString() === m.player1.participantId?.toString()
              ? m.player1
              : m.player2,
          )
          .filter((p) => p.name !== "BYE")
      : [];

    // Only include WB losers not already in the LB (prevents re-injection when
    // the WB final round stays as wbCurrent across multiple advance calls).
    const lbParticipantIds = new Set(
      losersBracket
        .flatMap((m) => [
          m.player1.participantId?.toString(),
          m.player2.participantId?.toString(),
        ])
        .filter((id) => id && id !== "null"),
    );
    const incomingLosers = wbLosers.filter(
      (p) => !lbParticipantIds.has(p.participantId?.toString()),
    );

    // The grand final can only be built once the losers bracket is exhausted.
    // Without the incomingLosers check the WB final's loser is stranded — they
    // are dropped from the winners bracket but never given their LB match, so
    // they leave the tournament on a single loss. Only reachable at n = 3, 4
    // and 5, where the WB final and the last LB round complete together.
    if (
      wbWinners.length === 1 &&
      lbWinners.length === 1 &&
      incomingLosers.length === 0
    ) {
      const docs = [
        {
          tournament: tournamentId,
          round: 1,
          matchNumber: 1,
          player1: wbWinners[0], // WB finalist (enters GF undefeated)
          player2: lbWinners[0], // LB finalist
          bracketSide: "grand_final",
        },
      ];
      return { completed: false, docs };
    }

    // Otherwise advance both brackets simultaneously
    const docs = [];

    // Advance WB
    if (wbWinners.length > 1) {
      const nextWbRound = wbMaxRound + 1;
      let wbMatchNumber = 1;
      for (let i = 0; i < wbWinners.length; i += 2) {
        if (i + 1 < wbWinners.length) {
          docs.push({
            tournament: tournamentId,
            round: nextWbRound,
            matchNumber: wbMatchNumber++,
            player1: wbWinners[i],
            player2: wbWinners[i + 1],
            bracketSide: "winners",
          });
        } else {
          docs.push(
            byeMatch(
              tournamentId,
              nextWbRound,
              wbMatchNumber++,
              wbWinners[i],
              "winners",
            ),
          );
        }
      }
    }

    // Feed WB losers into a new LB round + advance existing LB winners.
    const existingLbWinners = lbCurrent.length
      ? lbCurrent
          .filter((m) => m.status === "completed")
          .map((m) =>
            m.winnerId?.toString() === m.player1.participantId?.toString()
              ? m.player1
              : m.player2,
          )
          .filter((p) => p.name !== "BYE")
      : [];

    // Interleave incoming WB losers with existing LB survivors so each WB
    // loser faces an LB survivor (not another WB loser).
    const lbPool = [];
    const maxLen = Math.max(incomingLosers.length, existingLbWinners.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < incomingLosers.length) lbPool.push(incomingLosers[i]);
      if (i < existingLbWinners.length) lbPool.push(existingLbWinners[i]);
    }

    if (lbPool.length >= 1) {
      const nextLbRound = lbMaxRound + 1;
      let lbMatchNumber = 1;
      for (let i = 0; i < lbPool.length; i += 2) {
        if (i + 1 < lbPool.length) {
          docs.push({
            tournament: tournamentId,
            round: nextLbRound,
            matchNumber: lbMatchNumber++,
            player1: lbPool[i],
            player2: lbPool[i + 1],
            bracketSide: "losers",
          });
        } else {
          docs.push(
            byeMatch(
              tournamentId,
              nextLbRound,
              lbMatchNumber++,
              lbPool[i],
              "losers",
            ),
          );
        }
      }
    }

    return { completed: false, docs };
  }

  return {
    completed: false,
    docs: [],
    message: "Not all current round matches are complete",
  };
}
