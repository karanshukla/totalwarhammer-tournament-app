import { slot, byeMatch } from "./bracket-slots.js";

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
  const roster = [...participants];
  const hasBye = roster.length % 2 !== 0;
  if (hasBye)
    roster.push({ _id: null, participantId: null, name: "BYE", faction: "" });

  const playerCount = roster.length;
  const totalRounds = playerCount - 1;
  const docs = [];

  // Circle method
  const fixed = roster[0];
  const rotating = roster.slice(1);

  for (let r = 0; r < totalRounds; r++) {
    const round = r + 1;
    let matchNumber = 1;
    const players = [fixed, ...rotating];
    for (let i = 0; i < playerCount / 2; i++) {
      const p1 = players[i];
      const p2 = players[playerCount - 1 - i];
      if (p1.name === "BYE" || p2.name === "BYE") {
        // Give the real player a bye win
        const real = p1.name === "BYE" ? p2 : p1;
        docs.push(
          byeMatch(
            tournamentId,
            round,
            matchNumber++,
            slot(real, enable40kFactions),
          ),
        );
      } else {
        docs.push({
          tournament: tournamentId,
          round,
          matchNumber: matchNumber++,
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
  const standingsById = new Map();
  for (const p of participants) {
    const id = (p.participantId ?? p._id)?.toString();
    if (id)
      standingsById.set(id, {
        name: p.name,
        faction: p.faction,
        wins: 0,
        losses: 0,
        played: 0,
      });
  }
  for (const m of allMatches) {
    if (m.status !== "completed" || !m.winnerId) continue;
    const winnerId = m.winnerId.toString();
    // A bye is a win with no opponent — it must score, or a player who drew
    // one is ranked below players with the same record who did not.
    if (m.player2.name === "BYE") {
      if (standingsById.has(winnerId)) {
        standingsById.get(winnerId).wins++;
        standingsById.get(winnerId).played++;
      }
      continue;
    }
    const loserId =
      winnerId === m.player1.participantId?.toString()
        ? m.player2.participantId?.toString()
        : m.player1.participantId?.toString();
    if (standingsById.has(winnerId)) {
      standingsById.get(winnerId).wins++;
      standingsById.get(winnerId).played++;
    }
    if (loserId && standingsById.has(loserId)) {
      standingsById.get(loserId).losses++;
      standingsById.get(loserId).played++;
    }
  }
  return [...standingsById.values()].sort(
    (a, b) => b.wins - a.wins || a.losses - b.losses,
  );
}
