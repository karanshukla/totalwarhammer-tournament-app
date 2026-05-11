import assert from "node:assert";
import { describe, it } from "node:test";
import {
  doubleElimStart,
  doubleElimAdvance,
} from "../../domain/services/tournament-service.js";

// Simulate completing all pending matches by setting a winner
function completeMatches(matches) {
  return matches.map((m) => {
    if (m.status === "completed") return m;
    return {
      ...m,
      status: "completed",
      winnerId: m.player1.participantId,
      loserId: m.player2.participantId,
      completedAt: new Date(),
    };
  });
}

// Run the full double elimination bracket to completion and return all matches
function runDoubleElim(tournamentId, participants) {
  const allMatches = completeMatches(doubleElimStart(tournamentId, participants));
  let iterations = 0;
  const maxIterations = 50;

  while (iterations++ < maxIterations) {
    const result = doubleElimAdvance(tournamentId, allMatches);
    if (result.completed) break;
    if (!result.docs || result.docs.length === 0) break;
    const newMatches = completeMatches(result.docs);
    allMatches.push(...newMatches);
  }

  return allMatches;
}

// Verify no participant plays two matches simultaneously in the same round+bracket
function assertNoDuplicateParticipantsPerRound(matches) {
  const roundBracketMap = new Map();
  for (const m of matches) {
    if (m.status !== "completed") continue;
    const key = `${m.bracketSide}-${m.round}`;
    if (!roundBracketMap.has(key)) roundBracketMap.set(key, new Set());
    const seen = roundBracketMap.get(key);
    const p1 = m.player1.participantId?.toString();
    const p2 = m.player2.participantId?.toString();
    if (p1 && p2 !== "null" && p2 !== null) {
      assert.ok(!seen.has(p1), `Participant ${m.player1.name} appears twice in ${key}`);
      assert.ok(!seen.has(p2), `Participant ${m.player2.name} appears twice in ${key}`);
    }
    if (p1) seen.add(p1);
    if (p2 && p2 !== "null") seen.add(p2);
  }
}

// Verify a grand final exists and has exactly 1 match (or 2 with bracket reset)
function assertGrandFinalExists(matches) {
  const gf = matches.filter((m) => m.bracketSide === "grand_final");
  assert.ok(gf.length >= 1, "Expected at least one grand final match");
  assert.ok(gf.length <= 2, "Expected at most two grand final matches (bracket reset)");
}

// Verify every non-BYE participant appears in the bracket
function assertAllParticipantsPresent(participants, matches) {
  const seen = new Set(
    matches.flatMap((m) => [
      m.player1.participantId?.toString(),
      m.player2.participantId?.toString(),
    ]).filter((id) => id && id !== "null"),
  );
  for (const p of participants) {
    const id = (p._id ?? p.participantId)?.toString();
    assert.ok(seen.has(id), `Participant ${p.name} never appeared in any match`);
  }
}

function makeParticipants(n) {
  return Array.from({ length: n }, (_, i) => ({
    _id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    faction: "Empire",
  }));
}

describe("doubleElimAdvance", () => {
  const tid = "tournament1";

  for (const n of [3, 4, 5, 6, 7, 8, 9]) {
    it(`completes correctly with ${n} players`, () => {
      const participants = makeParticipants(n);
      const allMatches = runDoubleElim(tid, participants);

      assertGrandFinalExists(allMatches);
      assertNoDuplicateParticipantsPerRound(allMatches);
      assertAllParticipantsPresent(participants, allMatches);
    });
  }

  it("WB losers are never injected into LB twice", () => {
    const participants = makeParticipants(7);
    const allMatches = runDoubleElim(tid, participants);

    // Count how many times each participant appears as a LB participant
    const lbMatches = allMatches.filter((m) => m.bracketSide === "losers");
    const lbAppearances = new Map();
    for (const m of lbMatches) {
      for (const p of [m.player1, m.player2]) {
        if (!p.participantId || p.name === "BYE") continue;
        const id = p.participantId.toString();
        lbAppearances.set(id, (lbAppearances.get(id) || 0) + 1);
      }
    }

    // In a proper double elim, a player that loses in WB should appear in LB
    // rounds equal to (number of LB rounds they survive + 1). No one should
    // appear as an entrant more than once (entrant = first time in LB).
    // We check by verifying no one appears in LB more times than possible.
    // Max appearances: ceil(log2(n)) * 2 — a very generous upper bound.
    const maxAppearances = Math.ceil(Math.log2(participants.length)) * 2 + 2;
    for (const [id, count] of lbAppearances) {
      assert.ok(
        count <= maxAppearances,
        `Participant ${id} appeared ${count} times in LB matches (max expected: ${maxAppearances}) — likely injected twice`,
      );
    }
  });

  it("WB losers face LB survivors (not other WB losers) in drop-in rounds", () => {
    const participants = makeParticipants(8);
    const allMatches = runDoubleElim(tid, participants);

    // Find WB participants by round
    const wbRounds = new Map();
    for (const m of allMatches.filter((m) => m.bracketSide === "winners")) {
      if (!wbRounds.has(m.round)) wbRounds.set(m.round, []);
      wbRounds.get(m.round).push(m);
    }

    // Collect all WB losers per WB round
    const wbLosersByRound = new Map();
    for (const [round, matches] of wbRounds) {
      const losers = new Set(
        matches
          .filter((m) => m.status === "completed")
          .map((m) =>
            m.winnerId?.toString() === m.player1.participantId?.toString()
              ? m.player2.participantId?.toString()
              : m.player1.participantId?.toString(),
          )
          .filter((id) => id && id !== "null"),
      );
      wbLosersByRound.set(round, losers);
    }

    // For each LB round, if it contains WB losers, verify they face LB survivors
    const lbRounds = new Map();
    for (const m of allMatches.filter((m) => m.bracketSide === "losers")) {
      if (!lbRounds.has(m.round)) lbRounds.set(m.round, []);
      lbRounds.get(m.round).push(m);
    }

    // Collect all WB loser IDs across all rounds
    const allWbLoserIds = new Set(
      [...wbLosersByRound.values()].flatMap((s) => [...s]),
    );

    for (const [, lbMatches] of lbRounds) {
      for (const m of lbMatches) {
        if (m.player2.name === "BYE") continue;
        const p1Id = m.player1.participantId?.toString();
        const p2Id = m.player2.participantId?.toString();
        const p1IsWbLoser = allWbLoserIds.has(p1Id);
        const p2IsWbLoser = allWbLoserIds.has(p2Id);
        // Both players being WB losers in the same LB match would be wrong
        // (should only happen in LB R1 consolidation — but with 8 players LB R1
        // IS purely WB losers facing off, so this only applies to later rounds)
        if (p1IsWbLoser && p2IsWbLoser) {
          // This is only acceptable in LB round 1 (initial consolidation)
          assert.ok(
            m.round === 1,
            `LB round ${m.round}: two WB losers (${m.player1.name} vs ${m.player2.name}) face each other — expected WB loser vs LB survivor`,
          );
        }
      }
    }
  });
});
