/**
 * Tournament format service — encapsulates bracket/schedule generation and
 * round-advancement logic for all supported tournament types.
 *
 * Supported formats:
 *   - Single Elimination
 *   - Double Elimination
 *   - Round Robin
 *   - Swiss System
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Fisher-Yates shuffle (in-place, returns array). */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Slot object from a participant subdoc. */
function slot(p, isBetaFaction = false) {
  return {
    participantId: p._id ?? p.participantId,
    name: p.name,
    faction: p.faction || "",
    isBetaFaction,
  };
}

/** Bye match — player1 wins automatically. */
function byeMatch(
  tournamentId,
  round,
  matchNumber,
  p,
  bracketSide = null,
  isBetaFaction = false,
) {
  return {
    tournament: tournamentId,
    round,
    matchNumber,
    player1: {
      participantId: p.participantId ?? p._id,
      name: p.name,
      faction: p.faction || "",
      isBetaFaction,
    },
    player2: {
      participantId: null,
      name: "BYE",
      faction: "",
      isBetaFaction: false,
    },
    winnerId: p.participantId ?? p._id,
    loserId: null,
    status: "completed",
    completedAt: new Date(),
    bracketSide,
  };
}

// ─── Single Elimination ───────────────────────────────────────────────────────

export function singleElimStart(
  tournamentId,
  participants,
  enable40kFactions = false,
) {
  const seeded = shuffle([...participants]);
  const docs = [];
  let mn = 1;
  for (let i = 0; i < seeded.length; i += 2) {
    if (i + 1 < seeded.length) {
      docs.push({
        tournament: tournamentId,
        round: 1,
        matchNumber: mn++,
        player1: slot(seeded[i], enable40kFactions),
        player2: slot(seeded[i + 1], enable40kFactions),
        bracketSide: "winners",
      });
    } else {
      docs.push(
        byeMatch(
          tournamentId,
          1,
          mn++,
          slot(seeded[i], enable40kFactions),
          "winners",
          enable40kFactions,
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
    const wId = m.winnerId?.toString();
    return wId === m.player1.participantId?.toString() ? m.player1 : m.player2;
  });

  if (winners.length === 1) return { completed: true, docs: [] };

  const docs = [];
  let mn = 1;
  for (let i = 0; i < winners.length; i += 2) {
    if (i + 1 < winners.length) {
      docs.push({
        tournament: tournamentId,
        round: nextRound,
        matchNumber: mn++,
        player1: winners[i],
        player2: winners[i + 1],
        bracketSide: "winners",
      });
    } else {
      docs.push(byeMatch(tournamentId, nextRound, mn++, winners[i], "winners"));
    }
  }
  return { completed: false, docs };
}

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
  let mn = 1;
  for (let i = 0; i < seeded.length; i += 2) {
    if (i + 1 < seeded.length) {
      docs.push({
        tournament: tournamentId,
        round: 1,
        matchNumber: mn++,
        player1: slot(seeded[i], enable40kFactions),
        player2: slot(seeded[i + 1], enable40kFactions),
        bracketSide: "winners",
      });
    } else {
      docs.push(
        byeMatch(
          tournamentId,
          1,
          mn++,
          slot(seeded[i], enable40kFactions),
          "winners",
          enable40kFactions,
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
  const wb = allMatches.filter((m) => m.bracketSide === "winners");
  const lb = allMatches.filter((m) => m.bracketSide === "losers");
  const gf = allMatches.filter((m) => m.bracketSide === "grand_final");

  const wbMaxRound = wb.length ? Math.max(...wb.map((m) => m.round)) : 0;
  const lbMaxRound = lb.length ? Math.max(...lb.map((m) => m.round)) : 0;

  const wbCurrent = wb.filter((m) => m.round === wbMaxRound);
  const lbCurrent = lb.filter((m) => m.round === lbMaxRound);

  const wbDone = wbCurrent.every((m) => m.status === "completed");
  const lbDone =
    lbCurrent.every((m) => m.status === "completed") || lbCurrent.length === 0;

  // ── Grand final already exists ────────────────────────────────────────────
  if (gf.length > 0) {
    const lastGF = gf[gf.length - 1];
    if (lastGF.status !== "completed") {
      return {
        completed: false,
        docs: [],
        message: "Grand final not yet completed",
      };
    }
    const gfWinnerId = lastGF.winnerId?.toString();
    const gfP1Id = lastGF.player1.participantId?.toString();
    // If LB player (player2 in GF) wins, there's a bracket reset
    const lbPlayerWon = gfWinnerId !== gfP1Id;
    const resetCount = gf.filter((m) => m.bracketSide === "grand_final").length;
    if (lbPlayerWon && resetCount === 1) {
      // Bracket reset — play one more grand final, same matchup, both start fresh
      const nextGFRound = gf.length + 1;
      const docs = [
        {
          tournament: tournamentId,
          round: nextGFRound,
          matchNumber: 1,
          player1: lastGF.player1, // WB finalist
          player2: lastGF.player2, // LB finalist (won the first GF)
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

    if (wbWinners.length === 1 && lbWinners.length === 1) {
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
      let wbMn = 1;
      for (let i = 0; i < wbWinners.length; i += 2) {
        if (i + 1 < wbWinners.length) {
          docs.push({
            tournament: tournamentId,
            round: nextWbRound,
            matchNumber: wbMn++,
            player1: wbWinners[i],
            player2: wbWinners[i + 1],
            bracketSide: "winners",
          });
        } else {
          docs.push(
            byeMatch(
              tournamentId,
              nextWbRound,
              wbMn++,
              wbWinners[i],
              "winners",
            ),
          );
        }
      }
    }

    // Feed WB losers into new LB round + advance existing LB winners.
    // Only include WB losers not already in the LB (prevents re-injection when
    // the WB final round stays as wbCurrent across multiple advance calls).
    const lbParticipantIds = new Set(
      lb
        .flatMap((m) => [
          m.player1.participantId?.toString(),
          m.player2.participantId?.toString(),
        ])
        .filter((id) => id && id !== "null"),
    );
    const incomingLosers = wbLosers.filter(
      (p) => !lbParticipantIds.has(p.participantId?.toString()),
    );
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
      let lbMn = 1;
      for (let i = 0; i < lbPool.length; i += 2) {
        if (i + 1 < lbPool.length) {
          docs.push({
            tournament: tournamentId,
            round: nextLbRound,
            matchNumber: lbMn++,
            player1: lbPool[i],
            player2: lbPool[i + 1],
            bracketSide: "losers",
          });
        } else {
          docs.push(
            byeMatch(tournamentId, nextLbRound, lbMn++, lbPool[i], "losers"),
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

// ─── Round Robin ──────────────────────────────────────────────────────────────
//
// All matches are generated upfront using the circle/polygon algorithm.
// Rounds are natural — each player plays once per round.
// Tournament completes when all matches are done (admin triggers "advance" to finalise).

export function roundRobinStart(
  tournamentId,
  participants,
  enable40kFactions = false,
) {
  const ps = [...participants];
  const hasBye = ps.length % 2 !== 0;
  if (hasBye)
    ps.push({ _id: null, participantId: null, name: "BYE", faction: "" });

  const n = ps.length;
  const totalRounds = n - 1;
  const docs = [];

  // Circle method
  const fixed = ps[0];
  const rotating = ps.slice(1);

  for (let r = 0; r < totalRounds; r++) {
    const round = r + 1;
    let mn = 1;
    const players = [fixed, ...rotating];
    for (let i = 0; i < n / 2; i++) {
      const p1 = players[i];
      const p2 = players[n - 1 - i];
      if (p1.name === "BYE" || p2.name === "BYE") {
        // Give the real player a bye win
        const real = p1.name === "BYE" ? p2 : p1;
        docs.push(
          byeMatch(
            tournamentId,
            round,
            mn++,
            slot(real, enable40kFactions),
            null,
            enable40kFactions,
          ),
        );
      } else {
        docs.push({
          tournament: tournamentId,
          round,
          matchNumber: mn++,
          player1: slot(p1, enable40kFactions),
          player2: slot(p2, enable40kFactions),
        });
      }
    }
    // Rotate: last element goes to position 1
    rotating.unshift(rotating.pop());
  }

  return docs;
}

/**
 * Round Robin advance — called after admin clicks "Advance".
 * If all matches are done, mark tournament completed.
 * Otherwise just confirm current state (no new matches to generate).
 */
export function roundRobinAdvance(allMatches) {
  const incomplete = allMatches.filter((m) => m.status !== "completed");
  if (incomplete.length > 0) {
    return {
      completed: false,
      docs: [],
      message: `${incomplete.length} match(es) still pending`,
    };
  }
  return { completed: true, docs: [] };
}

/**
 * Compute Round Robin standings from completed matches.
 * Returns array sorted by wins desc, then goal diff (not applicable here so wins only).
 */
export function roundRobinStandings(participants, allMatches) {
  const map = new Map();
  for (const p of participants) {
    const id = (p.participantId ?? p._id)?.toString();
    if (id)
      map.set(id, {
        name: p.name,
        faction: p.faction,
        wins: 0,
        losses: 0,
        played: 0,
      });
  }
  for (const m of allMatches) {
    if (m.status !== "completed" || !m.winnerId || m.player2.name === "BYE")
      continue;
    const wId = m.winnerId.toString();
    const lId =
      wId === m.player1.participantId?.toString()
        ? m.player2.participantId?.toString()
        : m.player1.participantId?.toString();
    if (map.has(wId)) {
      map.get(wId).wins++;
      map.get(wId).played++;
    }
    if (lId && map.has(lId)) {
      map.get(lId).losses++;
      map.get(lId).played++;
    }
  }
  return [...map.values()].sort(
    (a, b) => b.wins - a.wins || a.losses - b.losses,
  );
}

// ─── Swiss System ─────────────────────────────────────────────────────────────
//
// Round 1: random pairing.
// Subsequent rounds: pair players with same number of wins (top-down), no rematches.
// Typical swiss ends after ceil(log2(n)) rounds; admin decides when to stop.

export function swissStart(
  tournamentId,
  participants,
  enable40kFactions = false,
) {
  const seeded = shuffle([...participants]);
  const docs = [];
  let mn = 1;
  for (let i = 0; i < seeded.length; i += 2) {
    if (i + 1 < seeded.length) {
      docs.push({
        tournament: tournamentId,
        round: 1,
        matchNumber: mn++,
        player1: slot(seeded[i], enable40kFactions),
        player2: slot(seeded[i + 1], enable40kFactions),
      });
    } else {
      docs.push(
        byeMatch(
          tournamentId,
          1,
          mn++,
          slot(seeded[i], enable40kFactions),
          null,
          enable40kFactions,
        ),
      );
    }
  }
  return docs;
}

/**
 * Swiss advance — pair players by win score, avoiding rematches.
 */
export function swissAdvance(
  tournamentId,
  participants,
  allMatches,
  nextRound,
) {
  // Build score map
  const scores = new Map();
  for (const p of participants) {
    const id = (p.participantId ?? p._id)?.toString();
    if (id)
      scores.set(id, {
        p: { participantId: id, name: p.name, faction: p.faction || "" },
        wins: 0,
      });
  }

  // Track played pairs to avoid rematches
  const played = new Set();
  for (const m of allMatches) {
    if (m.status !== "completed" || m.player2.name === "BYE") continue;
    const a = m.player1.participantId?.toString();
    const b = m.player2.participantId?.toString();
    if (a && b) {
      played.add(`${a}_${b}`);
      played.add(`${b}_${a}`);
    }
    const wId = m.winnerId?.toString();
    if (wId && scores.has(wId)) scores.get(wId).wins++;
  }

  // Group by wins, sort desc
  const entries = [...scores.values()].sort((a, b) => b.wins - a.wins);

  // Greedy pairing — try to pair adjacent players, skip rematches
  const unpaired = [...entries];
  const docs = [];
  let mn = 1;

  while (unpaired.length > 0) {
    const p1entry = unpaired.shift();
    let paired = false;
    for (let i = 0; i < unpaired.length; i++) {
      const p2entry = unpaired[i];
      const key = `${p1entry.p.participantId}_${p2entry.p.participantId}`;
      if (!played.has(key)) {
        docs.push({
          tournament: tournamentId,
          round: nextRound,
          matchNumber: mn++,
          player1: p1entry.p,
          player2: p2entry.p,
        });
        unpaired.splice(i, 1);
        paired = true;
        break;
      }
    }
    if (!paired) {
      // All remaining opponents already played — forced rematch or bye
      if (unpaired.length > 0) {
        const p2entry = unpaired.shift();
        docs.push({
          tournament: tournamentId,
          round: nextRound,
          matchNumber: mn++,
          player1: p1entry.p,
          player2: p2entry.p,
        });
      } else {
        docs.push(byeMatch(tournamentId, nextRound, mn++, p1entry.p));
      }
    }
  }

  return { completed: false, docs };
}

/**
 * Swiss standings — same as round robin standings.
 */
export function swissStandings(participants, allMatches) {
  return roundRobinStandings(participants, allMatches);
}
