import { Swiss as blossomSwiss } from "tournament-pairings";

import { shuffle, slot, byeMatch } from "./bracket-slots.js";
import { roundRobinStandings } from "./round-robin-service.js";

// ─── Swiss System ─────────────────────────────────────────────────────────────
//
// Round 1: random pairing.
// Subsequent rounds: Blossom algorithm (maximum cardinality matching) via
// tournament-pairings, pairing by win score while avoiding rematches.
// Typical swiss ends after ceil(log2(n)) rounds; admin decides when to stop.

export function swissStart(
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
      });
    } else {
      docs.push(
        byeMatch(
          tournamentId,
          1,
          matchNumber++,
          slot(seeded[i], enable40kFactions),
        ),
      );
    }
  }
  return docs;
}

/**
 * Swiss advance — pair players using the Blossom algorithm (maximum cardinality
 * matching) via tournament-pairings, by win score with rematch avoidance.
 */
export function swissAdvance(
  tournamentId,
  participants,
  allMatches,
  nextRound,
  enable40kFactions = false,
) {
  const scores = new Map();
  for (const p of participants) {
    const id = (p.participantId ?? p._id)?.toString();
    if (id)
      scores.set(id, {
        p: {
          participantId: id,
          name: p.name,
          faction: p.faction || "",
          isBetaFaction: enable40kFactions,
        },
        wins: 0,
        avoid: [],
        receivedBye: false,
      });
  }

  for (const m of allMatches) {
    if (m.status !== "completed") continue;
    // A bye is a free win. Scoring it as nothing left the player in the bottom
    // score group, which is exactly who the pairing engine hands the next bye
    // to — so the same player kept drawing byes round after round.
    if (m.player2.name === "BYE") {
      const byeId = m.player1.participantId?.toString();
      const entry = byeId && scores.get(byeId);
      if (entry) {
        entry.wins++;
        entry.receivedBye = true;
      }
      continue;
    }
    const a = m.player1.participantId?.toString();
    const b = m.player2.participantId?.toString();
    if (a && b) {
      scores.get(a)?.avoid.push(b);
      scores.get(b)?.avoid.push(a);
    }
    const winnerId = m.winnerId?.toString();
    if (winnerId && scores.has(winnerId)) scores.get(winnerId).wins++;
  }

  const players = [...scores.values()].map(
    ({ p, wins, avoid, receivedBye }) => ({
      id: p.participantId,
      score: wins,
      avoid,
      receivedBye,
    }),
  );

  // Blossom throws when avoid constraints make a valid matching impossible.
  // In that case strip the avoid lists and force rematches (last-resort behavior).
  let pairings;
  try {
    pairings = blossomSwiss(players, nextRound);
  } catch {
    pairings = blossomSwiss(
      players.map((p) => ({ ...p, avoid: [] })),
      nextRound,
    );
  }

  const docs = [];
  let matchNumber = 1;
  for (const pairing of pairings) {
    const p1 = scores.get(pairing.player1?.toString())?.p;
    if (pairing.player2 === null) {
      docs.push(byeMatch(tournamentId, nextRound, matchNumber++, p1));
    } else {
      const p2 = scores.get(pairing.player2?.toString())?.p;
      docs.push({
        tournament: tournamentId,
        round: nextRound,
        matchNumber: matchNumber++,
        player1: p1,
        player2: p2,
      });
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
