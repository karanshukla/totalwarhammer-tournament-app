import assert from "node:assert";
import { describe, it } from "node:test";

import {
  singleElimStart,
  doubleElimStart,
  doubleElimAdvance,
  roundRobinStart,
  swissStart,
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
  const allMatches = completeMatches(
    doubleElimStart(tournamentId, participants),
  );
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
      assert.ok(
        !seen.has(p1),
        `Participant ${m.player1.name} appears twice in ${key}`,
      );
      assert.ok(
        !seen.has(p2),
        `Participant ${m.player2.name} appears twice in ${key}`,
      );
    }
    if (p1) seen.add(p1);
    if (p2 && p2 !== "null") seen.add(p2);
  }
}

// Verify a grand final exists and has exactly 1 match (or 2 with bracket reset)
function assertGrandFinalExists(matches) {
  const gf = matches.filter((m) => m.bracketSide === "grand_final");
  assert.ok(gf.length >= 1, "Expected at least one grand final match");
  assert.ok(
    gf.length <= 2,
    "Expected at most two grand final matches (bracket reset)",
  );
}

// Verify every non-BYE participant appears in the bracket
function assertAllParticipantsPresent(participants, matches) {
  const seen = new Set(
    matches
      .flatMap((m) => [
        m.player1.participantId?.toString(),
        m.player2.participantId?.toString(),
      ])
      .filter((id) => id && id !== "null"),
  );
  for (const p of participants) {
    const id = (p._id ?? p.participantId)?.toString();
    assert.ok(
      seen.has(id),
      `Participant ${p.name} never appeared in any match`,
    );
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

    const lbRounds = new Map();
    for (const m of allMatches.filter((m) => m.bracketSide === "losers")) {
      if (!lbRounds.has(m.round)) lbRounds.set(m.round, []);
      lbRounds.get(m.round).push(m);
    }

    // Track which LB round each player first appeared in (their LB debut).
    // A player who won LB R1 is an "LB survivor" in R2, not a fresh drop-in,
    // even though they originally lost in WB.
    const lbDebut = new Map();
    const sortedRounds = [...lbRounds.keys()].sort((a, b) => a - b);
    for (const round of sortedRounds) {
      for (const m of lbRounds.get(round)) {
        const p1Id = m.player1.participantId?.toString();
        const p2Id = m.player2.participantId?.toString();
        if (p1Id && p1Id !== "null" && !lbDebut.has(p1Id))
          lbDebut.set(p1Id, round);
        if (p2Id && p2Id !== "null" && !lbDebut.has(p2Id))
          lbDebut.set(p2Id, round);
      }
    }

    for (const [lbRound, lbMatches] of lbRounds) {
      for (const m of lbMatches) {
        if (m.player2.name === "BYE") continue;
        const p1Id = m.player1.participantId?.toString();
        const p2Id = m.player2.participantId?.toString();
        const p1IsDebut = lbDebut.get(p1Id) === lbRound;
        const p2IsDebut = lbDebut.get(p2Id) === lbRound;
        // Two fresh LB entrants facing each other is only acceptable in LB R1
        if (p1IsDebut && p2IsDebut) {
          assert.ok(
            lbRound === 1,
            `LB round ${lbRound}: two fresh LB entrants (${m.player1.name} vs ${m.player2.name}) face each other — expected fresh entrant vs LB survivor`,
          );
        }
      }
    }
  });
});

describe("isBetaFaction propagation", () => {
  const tid = "t1";
  const makePlayers = (n, faction = "Empire") =>
    Array.from({ length: n }, (_, i) => ({
      _id: `p${i + 1}`,
      name: `Player ${i + 1}`,
      faction,
    }));

  function allSlots(matches) {
    return matches.flatMap((m) => [m.player1, m.player2]);
  }

  function realSlots(matches) {
    return allSlots(matches).filter((s) => s.name !== "BYE");
  }

  describe("singleElimStart", () => {
    it("sets isBetaFaction: false on all slots when enable40kFactions is false", () => {
      const matches = singleElimStart(tid, makePlayers(4), false);
      for (const slot of realSlots(matches)) {
        assert.strictEqual(slot.isBetaFaction, false);
      }
    });

    it("sets isBetaFaction: true on all real slots when enable40kFactions is true", () => {
      const matches = singleElimStart(tid, makePlayers(4), true);
      for (const slot of realSlots(matches)) {
        assert.strictEqual(slot.isBetaFaction, true);
      }
    });

    it("always sets isBetaFaction: false on BYE slots even when 40k is enabled", () => {
      const matches = singleElimStart(tid, makePlayers(3), true);
      const byeSlots = allSlots(matches).filter((s) => s.name === "BYE");
      assert.ok(byeSlots.length > 0, "Expected at least one BYE slot");
      for (const slot of byeSlots) {
        assert.strictEqual(slot.isBetaFaction, false);
      }
    });

    it("defaults to false when enable40kFactions is omitted", () => {
      const matches = singleElimStart(tid, makePlayers(4));
      for (const slot of realSlots(matches)) {
        assert.strictEqual(slot.isBetaFaction, false);
      }
    });
  });

  describe("doubleElimStart", () => {
    it("sets isBetaFaction: true on all real slots when enabled", () => {
      const matches = doubleElimStart(tid, makePlayers(4), true);
      for (const slot of realSlots(matches)) {
        assert.strictEqual(slot.isBetaFaction, true);
      }
    });

    it("sets isBetaFaction: false when disabled", () => {
      const matches = doubleElimStart(tid, makePlayers(4), false);
      for (const slot of realSlots(matches)) {
        assert.strictEqual(slot.isBetaFaction, false);
      }
    });
  });

  describe("roundRobinStart", () => {
    it("sets isBetaFaction: true on all real slots when enabled", () => {
      const matches = roundRobinStart(tid, makePlayers(4), true);
      for (const slot of realSlots(matches)) {
        assert.strictEqual(slot.isBetaFaction, true);
      }
    });

    it("sets isBetaFaction: false when disabled", () => {
      const matches = roundRobinStart(tid, makePlayers(4), false);
      for (const slot of realSlots(matches)) {
        assert.strictEqual(slot.isBetaFaction, false);
      }
    });

    it("BYE slots have isBetaFaction: false even when 40k is enabled", () => {
      const matches = roundRobinStart(tid, makePlayers(3), true);
      const byeSlots = allSlots(matches).filter((s) => s.name === "BYE");
      assert.ok(byeSlots.length > 0);
      for (const slot of byeSlots) {
        assert.strictEqual(slot.isBetaFaction, false);
      }
    });
  });

  describe("swissStart", () => {
    it("sets isBetaFaction: true on all real slots when enabled", () => {
      const matches = swissStart(tid, makePlayers(4), true);
      for (const slot of realSlots(matches)) {
        assert.strictEqual(slot.isBetaFaction, true);
      }
    });

    it("sets isBetaFaction: false when disabled", () => {
      const matches = swissStart(tid, makePlayers(4), false);
      for (const slot of realSlots(matches)) {
        assert.strictEqual(slot.isBetaFaction, false);
      }
    });
  });
});
